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
   * @param {string} category - Category (local or national)
   * @returns {string} - Unique file path
   */
  function generateArtworkPath(userId, fileName, category = 'local') {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = fileName.split('.').pop();
    // Include category in the path: artworks/{category}/{userId}/{timestamp}-{random}.{ext}
    return `artworks/${category}/${userId}/${timestamp}-${randomSuffix}.${extension}`;
  }
  
  // ============================================
  // ARTWORK UPLOAD FUNCTIONS
  // ============================================
  
  /**
   * Upload artwork image to Supabase Storage
   * @param {File} file - The image file to upload
   * @param {string} userId - The artist's user ID
   * @param {string} category - The category (local or national)
   * @returns {Promise<Object>} - Result with download URL or error
   */
  async function uploadArtworkImage(file, userId, category = 'local') {
    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      // Generate unique file path with category
      const filePath = generateArtworkPath(userId, file.name, category);
      
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
   * @param {string} category - Optional category filter ('local' or 'national')
   * @returns {Promise<Array>} - Array of public artwork documents
   */
  async function getPublicArtworks(category = null) {
    try {
      const artworksRef = collection(db, 'artworks');
      let q;
      
      // If category is specified, filter by both isPublic and category
      if (category) {
        q = query(
          artworksRef,
          where('isPublic', '==', true),
          where('category', '==', category),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          artworksRef,
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc')
        );
      }
      
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
   * @param {Object} metadata - Artwork metadata (title, description, tags, category)
   * @returns {Promise<Object>} - Complete result
   */
  async function uploadAndSaveArtwork(file, userId, metadata) {
    try {
      // Get category, default to 'local'
      const category = metadata.category || 'local';
      
      // Step 1: Upload image to Supabase Storage with category
      const uploadResult = await uploadArtworkImage(file, userId, category);
      
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

  // ============================================
  // MUSEUM CRUD OPERATIONS
  // ============================================

  /**
   * Validate museum data
   * @param {Object} museumData - Museum data to validate
   * @returns {Object} - Validation result with isValid and error message
   */
  function validateMuseumData(museumData) {
    if (!museumData) {
      return { isValid: false, error: 'No museum data provided' };
    }
    
    if (!museumData.name || museumData.name.trim() === '') {
      return { isValid: false, error: 'Museum name is required' };
    }
    
    if (museumData.name.length > 200) {
      return { isValid: false, error: 'Museum name must be less than 200 characters' };
    }
    
    if (museumData.type && !['local', 'national'].includes(museumData.type)) {
      return { isValid: false, error: 'Museum type must be either "local" or "national"' };
    }
    
    if (museumData.contactInfo) {
      if (museumData.contactInfo.email && !isValidEmail(museumData.contactInfo.email)) {
        return { isValid: false, error: 'Invalid email format' };
      }
      
      if (museumData.contactInfo.website && !isValidUrl(museumData.contactInfo.website)) {
        return { isValid: false, error: 'Invalid website URL format' };
      }
    }
    
    return { isValid: true, error: null };
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid
   */
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new museum record
   * @param {string} artistId - The artist's user ID
   * @param {Object} museumData - Museum data including name, location, type, exhibition history, contact info
   * @returns {Promise<Object>} - Result with saved museum or error
   */
  async function createMuseum(artistId, museumData) {
    try {
      // Validate required fields
      const validation = validateMuseumData(museumData);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }
      
      // Check if user is an artist
      const isArtist = await checkIsArtist(artistId);
      const isAdmin = await checkIsAdmin(artistId);
      
      if (!isArtist && !isAdmin) {
        return { success: false, error: 'Only verified artist accounts can create museum records' };
      }
      
      const museumRef = collection(db, 'museums');
      const museumRecord = {
        name: museumData.name,
        location: museumData.location || '',
        type: museumData.type || 'local', // 'local' or 'national'
        exhibitionHistory: museumData.exhibitionHistory || [],
        contactInfo: {
          email: museumData.contactInfo?.email || '',
          phone: museumData.contactInfo?.phone || '',
          website: museumData.contactInfo?.website || '',
          address: museumData.contactInfo?.address || ''
        },
        description: museumData.description || '',
        artistId: artistId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(museumRef, museumRecord);
      
      return {
        success: true,
        id: docRef.id,
        data: museumRecord
      };
    } catch (error) {
      console.error('Create museum error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all museums created by an artist
   * @param {string} artistId - The artist's user ID
   * @returns {Promise<Array>} - Array of museum documents
   */
  async function getMuseumsByArtist(artistId) {
    try {
      const museumsRef = collection(db, 'museums');
      const q = query(
        museumsRef,
        where('artistId', '==', artistId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const museums = [];
      
      querySnapshot.forEach((doc) => {
        museums.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, museums };
    } catch (error) {
      console.error('Get museums error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all museums (for viewing)
   * @param {string} type - Optional type filter ('local' or 'national')
   * @returns {Promise<Array>} - Array of museum documents
   */
  async function getAllMuseums(type = null) {
    try {
      const museumsRef = collection(db, 'museums');
      let q;
      
      if (type) {
        q = query(
          museumsRef,
          where('type', '==', type),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          museumsRef,
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const museums = [];
      
      querySnapshot.forEach((doc) => {
        museums.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, museums };
    } catch (error) {
      console.error('Get all museums error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single museum by ID
   * @param {string} museumId - The museum document ID
   * @returns {Promise<Object>} - Museum document
   */
  async function getMuseumById(museumId) {
    try {
      const museumDocRef = doc(db, 'museums', museumId);
      const museumDoc = await getDoc(museumDocRef);
      
      if (museumDoc.exists()) {
        return { success: true, museum: { id: museumDoc.id, ...museumDoc.data() } };
      }
      return { success: false, error: 'Museum not found' };
    } catch (error) {
      console.error('Get museum error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a museum record
   * @param {string} museumId - The museum document ID
   * @param {Object} museumData - Updated museum data
   * @param {string} userId - The current user's ID (for permission check)
   * @returns {Promise<Object>} - Result with updated museum or error
   */
  async function updateMuseum(museumId, museumData, userId) {
    try {
      // First check if museum exists
      const museumDocRef = doc(db, 'museums', museumId);
      const museumDoc = await getDoc(museumDocRef);
      
      if (!museumDoc.exists()) {
        return { success: false, error: 'Museum not found' };
      }
      
      const museum = museumDoc.data();
      
      // Check if user is the owner or an admin
      const isOwner = museum.artistId === userId;
      const isAdmin = await checkIsAdmin(userId);
      
      if (!isOwner && !isAdmin) {
        return { success: false, error: 'You do not have permission to update this museum' };
      }
      
      // Build update data
      const updateData = {
        name: museumData.name !== undefined ? museumData.name : museum.name,
        location: museumData.location !== undefined ? museumData.location : museum.location,
        type: museumData.type !== undefined ? museumData.type : museum.type,
        description: museumData.description !== undefined ? museumData.description : museum.description,
        exhibitionHistory: museumData.exhibitionHistory !== undefined ? museumData.exhibitionHistory : museum.exhibitionHistory,
        contactInfo: {
          email: museumData.contactInfo?.email !== undefined ? museumData.contactInfo.email : (museum.contactInfo?.email || ''),
          phone: museumData.contactInfo?.phone !== undefined ? museumData.contactInfo.phone : (museum.contactInfo?.phone || ''),
          website: museumData.contactInfo?.website !== undefined ? museumData.contactInfo.website : (museum.contactInfo?.website || ''),
          address: museumData.contactInfo?.address !== undefined ? museumData.contactInfo.address : (museum.contactInfo?.address || '')
        },
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(museumDocRef, updateData, { merge: true });
      
      return {
        success: true,
        id: museumId,
        data: updateData
      };
    } catch (error) {
      console.error('Update museum error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a museum record
   * @param {string} museumId - The museum document ID
   * @param {string} userId - The current user's ID (for permission check)
   * @returns {Promise<Object>} - Result with success or error
   */
  async function deleteMuseum(museumId, userId) {
    try {
      // First check if museum exists
      const museumDocRef = doc(db, 'museums', museumId);
      const museumDoc = await getDoc(museumDocRef);
      
      if (!museumDoc.exists()) {
        return { success: false, error: 'Museum not found' };
      }
      
      const museum = museumDoc.data();
      
      // Check if user is the owner or an admin
      const isOwner = museum.artistId === userId;
      const isAdmin = await checkIsAdmin(userId);
      
      if (!isOwner && !isAdmin) {
        return { success: false, error: 'You do not have permission to delete this museum' };
      }
      
      // Delete the museum record
      await deleteDoc(museumDocRef);
      
      return { success: true, message: 'Museum deleted successfully' };
    } catch (error) {
      console.error('Delete museum error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add exhibition to museum's history
   * @param {string} museumId - The museum document ID
   * @param {Object} exhibitionData - Exhibition data (title, date, description)
   * @param {string} userId - The current user's ID (for permission check)
   * @returns {Promise<Object>} - Result with updated museum or error
   */
  async function addExhibitionToMuseum(museumId, exhibitionData, userId) {
    try {
      // First get the museum
      const museumResult = await getMuseumById(museumId);
      
      if (!museumResult.success) {
        return museumResult;
      }
      
      const museum = museumResult.museum;
      
      // Check permission
      const isOwner = museum.artistId === userId;
      const isAdmin = await checkIsAdmin(userId);
      
      if (!isOwner && !isAdmin) {
        return { success: false, error: 'You do not have permission to update this museum' };
      }
      
      // Create exhibition entry
      const exhibition = {
        id: Date.now().toString(),
        title: exhibitionData.title,
        date: exhibitionData.date || new Date().toISOString(),
        description: exhibitionData.description || '',
        addedAt: new Date().toISOString()
      };
      
      // Add to exhibition history
      const exhibitionHistory = museum.exhibitionHistory || [];
      exhibitionHistory.push(exhibition);
      
      // Update museum
      return await updateMuseum(museumId, { exhibitionHistory }, userId);
    } catch (error) {
      console.error('Add exhibition error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove exhibition from museum's history
   * @param {string} museumId - The museum document ID
   * @param {string} exhibitionId - The exhibition ID to remove
   * @param {string} userId - The current user's ID (for permission check)
   * @returns {Promise<Object>} - Result with updated museum or error
   */
  async function removeExhibitionFromMuseum(museumId, exhibitionId, userId) {
    try {
      // First get the museum
      const museumResult = await getMuseumById(museumId);
      
      if (!museumResult.success) {
        return museumResult;
      }
      
      const museum = museumResult.museum;
      
      // Check permission
      const isOwner = museum.artistId === userId;
      const isAdmin = await checkIsAdmin(userId);
      
      if (!isOwner && !isAdmin) {
        return { success: false, error: 'You do not have permission to update this museum' };
      }
      
      // Remove exhibition from history
      const exhibitionHistory = (museum.exhibitionHistory || []).filter(
        ex => ex.id !== exhibitionId
      );
      
      // Update museum
      return await updateMuseum(museumId, { exhibitionHistory }, userId);
    } catch (error) {
      console.error('Remove exhibition error:', error);
      return { success: false, error: error.message };
    }
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
  window.validateMuseumData = validateMuseumData;
  window.createMuseum = createMuseum;
  window.getMuseumsByArtist = getMuseumsByArtist;
  window.getAllMuseums = getAllMuseums;
  window.getMuseumById = getMuseumById;
  window.updateMuseum = updateMuseum;
  window.deleteMuseum = deleteMuseum;
  window.addExhibitionToMuseum = addExhibitionToMuseum;
  window.removeExhibitionFromMuseum = removeExhibitionFromMuseum;
