// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
  import {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
  import {getFirestore, setDoc, doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, deleteDoc} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
  
  // Supabase Storage import
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  // Note: Auth & Firestore are used - file storage is handled by Supabase
 const firebaseConfig = {
  apiKey: "AIzaSyAj1k6vykPc_AcVy67_j31UGb2rRTzJH7o",
  authDomain: "kakamuseo.firebaseapp.com",
  projectId: "kakamuseo",
  storageBucket: "kakamuseo.firebasestorage.app",
  messagingSenderId: "428063366247",
  appId: "1:428063366247:web:6de923e74ecc627e6f08c2",
  measurementId: "G-JV9GSD9CX4"
};

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  
  // Initialize Firestore
  const db = getFirestore(app);
  
  // Initialize Auth
  const auth = getAuth(app);
  //const analytics = getAnalytics(app);
  
  // ============================================
  // SUPABASE STORAGE CONFIGURATION (replacing Firebase Storage)
  // ============================================
  
  // Supabase configuration
  const supabaseUrl = 'https://qdalybrlsjlqnfgnpzdu.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWx5YnJsc2pscW5mZ25wemR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzI4MDksImV4cCI6MjA4NzQwODgwOX0.QW-Zem0LORZUpyjMw4MPfEsoZ7qHU6kN6nMtVVKDu0w';
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Storage bucket reference (single bucket)
  const ARTWORK_BUCKET = 'storage';
  
  // ============================================
  // FILE VALIDATION CONSTANTS
  // ============================================
  
  // Allowed image MIME types
  const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  // Maximum file size (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================
  
  /**
   * Validate image file type and size
   * @param {File} file - The file to validate
   * @returns {Object} - Validation result with isValid and error message
   */
  function validateImageFile(file) {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }
    
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { 
        isValid: false, 
        error: `Invalid file type. Allowed: JPEG, PNG, GIF, WebP` 
      };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `File too large. Maximum size: 10MB` 
      };
    }
    
    return { isValid: true, error: null };
  }
  
  /**
   * Generate unique file path for artwork
   * @param {string} userId - Artist's user ID
   * @param {string} fileName - Original file name
   * @returns {string} - Unique file path
   */
  function generateArtworkPath(userId, fileName) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = fileName.split('.').pop();
    return `artworks/${userId}/${timestamp}-${randomSuffix}.${extension}`;
  }
  
  // ============================================
  // ARTWORK UPLOAD FUNCTIONS
  // ============================================
  
  /**
   * Upload artwork image to Supabase Storage
   * @param {File} file - The image file to upload
   * @param {string} userId - The artist's user ID
   * @returns {Promise<Object>} - Result with download URL or error
   */
  async function uploadArtworkImage(file, userId) {
    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      // Generate unique file path
      const filePath = generateArtworkPath(userId, file.name);
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('storage')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('storage')
        .getPublicUrl(filePath);
      
      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type
      };
      
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }
  
  /**
   * Delete artwork image from Supabase Storage
   * @param {string} filePath - The path of the file to delete
   * @returns {Promise<Object>} - Result with success or error
   */
  async function deleteArtworkImage(filePath) {
    try {
      const { data, error } = await supabase.storage
        .from('storage')
        .remove([filePath]);
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // ============================================
  // ARTWORK DATABASE FUNCTIONS
  // ============================================
  
  /**
   * Save artwork to Firestore
   * @param {string} artistId - The artist's user ID
   * @param {Object} artworkData - Artwork data including title, description, image URL
   * @returns {Promise<Object>} - Result with saved artwork or error
   */
  async function saveArtworkToFirestore(artistId, artworkData) {
    try {
      const artworkRef = collection(db, 'artworks');
      const artworkRecord = {
        title: artworkData.title,
        description: artworkData.description || '',
        imageUrl: artworkData.imageUrl,
        imagePath: artworkData.imagePath || '',
        artistId: artistId,
        category: artworkData.category || 'local',
        tags: artworkData.tags || [],
        createdAt: new Date().toISOString(),
        isPublic: artworkData.isPublic !== false
      };
      
      const docRef = await addDoc(artworkRef, artworkRecord);
      
      return {
        success: true,
        id: docRef.id,
        data: artworkRecord
      };
    } catch (error) {
      console.error('Save artwork error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all artworks by artist
   * @param {string} artistId - The artist's user ID
   * @returns {Promise<Array>} - Array of artwork documents
   */
  async function getArtworksByArtist(artistId) {
    try {
      const artworksRef = collection(db, 'artworks');
      const q = query(
        artworksRef,
        where('artistId', '==', artistId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const artworks = [];
      
      querySnapshot.forEach((doc) => {
        artworks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, artworks };
    } catch (error) {
      console.error('Get artworks error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all public artworks (for guests)
   * @returns {Promise<Array>} - Array of public artwork documents
   */
  async function getPublicArtworks() {
    try {
      const artworksRef = collection(db, 'artworks');
      const q = query(
        artworksRef,
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const artworks = [];
      
      querySnapshot.forEach((doc) => {
        artworks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, artworks };
    } catch (error) {
      console.error('Get public artworks error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update artwork in Firestore
   * @param {string} artworkId - The artwork document ID
   * @param {Object} artworkData - Updated artwork data
   * @param {string} userId - The current user's ID (for permission check)
   * @returns {Promise<Object>} - Result with updated artwork or error
   */
  async function updateArtwork(artworkId, artworkData, userId) {
    try {
      // First check if user owns this artwork
      const artworkDocRef = doc(db, 'artworks', artworkId);
      const artworkDoc = await getDoc(artworkDocRef);
      
      if (!artworkDoc.exists()) {
        return { success: false, error: 'Artwork not found' };
      }
      
      const artwork = artworkDoc.data();
      
      // Check if user is the owner or an admin
      const isOwner = artwork.artistId === userId;
      const isAdmin = await checkIsAdmin(userId);
      
      if (!isOwner && !isAdmin) {
        return { success: false, error: 'You do not have permission to update this artwork' };
      }
      
      // Update the artwork
      const updateData = {
        title: artworkData.title || artwork.title,
        description: artworkData.description !== undefined ? artworkData.description : artwork.description,
        tags: artworkData.tags || artwork.tags || [],
        isPublic: artworkData.isPublic !== undefined ? artworkData.isPublic : artwork.isPublic,
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(artworkDocRef, updateData, { merge: true });
      
      return {
        success: true,
        id: artworkId,
        data: updateData
      };
    } catch (error) {
      console.error('Update artwork error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete artwork from Firestore
   * @param {string} artworkId - The artwork document ID
   * @param {string} userId - The current user's ID (for permission check)
   * @returns {Promise<Object>} - Result with success or error
   */
  async function deleteArtwork(artworkId, userId) {
    try {
      // First check if user owns this artwork
      const artworkDocRef = doc(db, 'artworks', artworkId);
      const artworkDoc = await getDoc(artworkDocRef);
      
      if (!artworkDoc.exists()) {
        return { success: false, error: 'Artwork not found' };
      }
      
      const artwork = artworkDoc.data();
      
      // Check if user is the owner or an admin
      const isOwner = artwork.artistId === userId;
      const isAdmin = await checkIsAdmin(userId);
      
      if (!isOwner && !isAdmin) {
        return { success: false, error: 'You do not have permission to delete this artwork' };
      }
      
      // Delete from Firestore
      await deleteDoc(artworkDocRef);
      
      // Also delete the image from storage if exists
      if (artwork.imagePath) {
        await deleteArtworkImage(artwork.imagePath);
      }
      
      return { success: true, message: 'Artwork deleted successfully' };
    } catch (error) {
      console.error('Delete artwork error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if user is an artist
   * @param {string} userId - The user's ID
   * @returns {Promise<boolean>} - True if user is an artist
   */
  async function checkIsArtist(userId) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.role === 'artist';
      }
      return false;
    } catch (error) {
      console.error('Check artist error:', error);
      return false;
    }
  }
  
  /**
   * Check if user is an admin
   * @param {string} userId - The user's ID
   * @returns {Promise<boolean>} - True if user is an admin
   */
  async function checkIsAdmin(userId) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.role === 'admin';
      }
      return false;
    } catch (error) {
      console.error('Check admin error:', error);
      return false;
    }
  }
  
  /**
   * Get user profile data
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} - User profile data
   */
  async function getUserProfile(userId) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return { success: true, profile: { id: userDoc.id, ...userDoc.data() } };
      }
      return { success: false, error: 'User profile not found' };
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update user profile
   * @param {string} userId - The user's ID
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} - Result with updated profile or error
   */
  async function updateUserProfile(userId, profileData) {
    try {
      const userDocRef = doc(db, 'users', userId);
      
      const updateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        username: profileData.username,
        category: profileData.category,
        bio: profileData.bio || '',
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(userDocRef, updateData, { merge: true });
      
      return {
        success: true,
        data: updateData
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check user permissions based on role
   * @param {string} userId - The user's ID
   * @param {string} permission - The permission to check
   * @returns {Promise<boolean>} - True if user has permission
   */
  async function checkUserPermission(userId, permission) {
    try {
      const profile = await getUserProfile(userId);
      
      if (!profile.success) {
        return false;
      }
      
      const role = profile.profile.role;
      
      // Define permissions for each role
      const permissions = {
        admin: ['create_artwork', 'read_artwork', 'update_artwork', 'delete_artwork', 'upload_artwork', 'manage_profile', 'view_all', 'delete_user', 'update_role'],
        artist: ['create_artwork', 'read_artwork', 'update_artwork', 'delete_own_artwork', 'upload_artwork', 'manage_own_profile', 'view_public'],
        guest: ['read_artwork', 'view_public', 'manage_own_profile']
      };
      
      const rolePermissions = permissions[role] || [];
      return rolePermissions.includes(permission);
    } catch (error) {
      console.error('Check permission error:', error);
      return false;
    }
  }
  
  // Export functions globally for use in other files
  
  // Make functions available globally
  window.showNotification = function(message, type = 'info', duration = 4000) {
    // Check if home2.js has already defined this function
    if (typeof window.showNotification === 'function' && window !== window.parent) {
      // If already defined (by home2.js), just call it
      return window.showNotification(message, type, duration);
    }
    
    // Fallback: create a simple notification
    let container = document.getElementById('notificationContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notificationContainer';
      container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
      document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification-toast ' + type;
    notification.style.cssText = `
      position: relative;
      padding: 16px 24px;
      margin-bottom: 10px;
      border-radius: 8px;
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(-20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    
    if (type === 'success') {
      notification.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    } else if (type === 'error') {
      notification.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
    } else if (type === 'info') {
      notification.style.background = 'linear-gradient(135deg, #007bff, #0056b3)';
    } else if (type === 'warning') {
      notification.style.background = 'linear-gradient(135deg, #ffc107, #e0a800)';
      notification.style.color = '#333';
    }
    
    notification.innerHTML = `
      <span class="notification-message">${message}</span>
      <span class="notification-close" onclick="this.parentElement.remove()" style="position: absolute; top: 8px; right: 12px; cursor: pointer; font-size: 18px; font-weight: bold; opacity: 0.7;">&times;</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    if (duration > 0) {
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }, duration);
    }
  };
  
  window.showSuccess = function(message) { window.showNotification(message, 'success'); };
  window.showError = function(message) { window.showNotification(message, 'error', 6000); };
  window.showInfo = function(message) { window.showNotification(message, 'info'); };
  window.showWarning = function(message) { window.showNotification(message, 'warning', 5000); };
  window.db = db;
  window.auth = auth;
  window.supabase = supabase;
  
  // Firebase Auth functions
  window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
  window.signInWithEmailAndPassword = signInWithEmailAndPassword;
  window.signOut = signOut;
  window.onAuthStateChanged = onAuthStateChanged;
  
  // Firestore functions
  window.setDoc = setDoc;
  window.doc = doc;
  window.getDoc = getDoc;
  window.collection = collection;
  window.addDoc = addDoc;
  window.getDocs = getDocs;
  window.query = query;
  window.where = where;
  window.orderBy = orderBy;
  window.deleteDoc = deleteDoc;
  
  // App-specific functions
  window.saveArtworkToFirestore = saveArtworkToFirestore;
  window.getArtworksByArtist = getArtworksByArtist;
  window.getPublicArtworks = getPublicArtworks;
  window.updateArtwork = updateArtwork;
  window.deleteArtwork = deleteArtwork;
  window.checkIsArtist = checkIsArtist;
  window.checkIsAdmin = checkIsAdmin;
  window.getUserProfile = getUserProfile;
  window.updateUserProfile = updateUserProfile;
  window.checkUserPermission = checkUserPermission;
  window.uploadArtworkImage = uploadArtworkImage;
  window.deleteArtworkImage = deleteArtworkImage;
  window.validateImageFile = validateImageFile;
  window.generateArtworkPath = generateArtworkPath;
  
  /**
   * Complete artwork upload flow (upload + save to database)
   * @param {File} file - The image file
   * @param {string} userId - The artist's user ID
   * @param {Object} metadata - Artwork metadata (title, description, tags)
   * @returns {Promise<Object>} - Complete result
   */
  async function uploadAndSaveArtwork(file, userId, metadata) {
    try {
      // Step 1: Upload image to Supabase Storage
      const uploadResult = await uploadArtworkImage(file, userId);
      
      if (!uploadResult.success) {
        return uploadResult;
      }
      
      // Step 2: Save artwork metadata to Firestore
      const saveResult = await saveArtworkToFirestore(userId, {
        title: metadata.title,
        description: metadata.description || '',
        imageUrl: uploadResult.url,
        imagePath: uploadResult.path,
        category: metadata.category || 'local',
        tags: metadata.tags || [],
        isPublic: metadata.isPublic !== false
      });
      
      if (!saveResult.success) {
        // If database save fails, delete the uploaded image
        await deleteArtworkImage(uploadResult.path);
        return saveResult;
      }
      
      return {
        success: true,
        id: saveResult.id,
        imageUrl: uploadResult.url,
        path: uploadResult.path,
        ...saveResult.data
      };
      
    } catch (error) {
      console.error('Complete upload error:', error);
      return { success: false, error: error.message };
    }
  }

  function showMessage(message, divId){
    var messsageDiv=document.getElementById(divId);
    messsageDiv.style.display='block';
    messsageDiv.innerHTML=message;
    messsageDiv.style.opacity=1;
    setTimeout(function(){
        messsageDiv.style.opacity=0;
    },5000)

  }
  
  // Export functions for global access
  window.uploadArtworkImage = uploadArtworkImage;
  window.saveArtworkToFirestore = saveArtworkToFirestore;
  window.getArtworksByArtist = getArtworksByArtist;
  window.getPublicArtworks = getPublicArtworks;
  window.uploadAndSaveArtwork = uploadAndSaveArtwork;
  window.checkIsArtist = checkIsArtist;
  window.checkIsAdmin = checkIsAdmin;
  window.validateImageFile = validateImageFile;
  window.updateArtwork = updateArtwork;
  window.deleteArtwork = deleteArtwork;
  window.getUserProfile = getUserProfile;
  window.updateUserProfile = updateUserProfile;
  window.checkUserPermission = checkUserPermission;
