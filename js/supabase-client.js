// Supabase Storage Only Configuration
// Authentication is handled by Firebase - Supabase is used ONLY for file storage
// All auth-related code has been removed

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ============================================
// SUPABASE CONFIGURATION (Storage Only - No Auth)
// ============================================

const supabaseUrl = 'https://qdalybrlsjlqnfgnpzdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWx5YnJsc2pscW5mZ25wemR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzI4MDksImV4cCI6MjA4NzQwODgwOX0.QW-Zem0LORZUpyjMw4MPfEsoZ7qHU6kN6nMtVVKDu0w';

// Create Supabase client with auth DISABLED
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Storage bucket configuration
const ARTWORK_BUCKET = 'storage';

// Allowed file types for image uploads
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

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
  return `${userId}/${timestamp}-${randomSuffix}.${extension}`;
}

// ============================================
// STORAGE FUNCTIONS (Supabase Storage Only)
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
      .from(ARTWORK_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (error) throw error;
    
    // Get public URL for the uploaded file
    const { data: urlData, error: urlError } = supabase.storage
      .from(ARTWORK_BUCKET)
      .getPublicUrl(filePath);
    
    if (urlError) throw urlError;
    
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
    const { error } = await supabase.storage
      .from(ARTWORK_BUCKET)
      .remove([filePath]);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get public URL for an image
 * @param {string} filePath - The path of the file
 * @returns {string} - Public URL
 */
function getImageUrl(filePath) {
  const { data } = supabase.storage
    .from(ARTWORK_BUCKET)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function showMessage(message, divId) {
  var messsageDiv = document.getElementById(divId);
  if (messsageDiv) {
    messsageDiv.style.display = 'block';
    messsageDiv.innerHTML = message;
    messsageDiv.style.opacity = 1;
    setTimeout(function() {
      messsageDiv.style.opacity = 0;
    }, 5000);
  }
}

// ============================================
// EXPORTS - Storage functions only (no auth)
// ============================================

window.supabase = supabase;
window.uploadArtworkImage = uploadArtworkImage;
window.deleteArtworkImage = deleteArtworkImage;
window.getImageUrl = getImageUrl;
window.validateImageFile = validateImageFile;
window.generateArtworkPath = generateArtworkPath;
window.showMessage = showMessage;

// NOTE: Authentication is now handled by Firebase in firebase.js
// The following functions have been removed from this file:
// - signUp()
// - signIn() 
// - signOut()
// - getCurrentUser()
// - onAuthStateChanged()
// - saveUserProfile()
// - getUserProfile()
// - saveArtworkToDatabase()
// - getArtworksByArtist()
// - getPublicArtworks()
// - checkIsArtist()
// - uploadAndSaveArtwork()
//
// Use Firebase Auth (firebase.js) for authentication and 
// Firestore (firebase.js) for database operations instead.
