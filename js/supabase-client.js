// Supabase Client Configuration
// This file replaces Firebase with Supabase for authentication, storage, and database

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ============================================
// SUPABASE CONFIGURATION
// ============================================

// Replace these with your actual Supabase credentials
// You can get these from your Supabase project dashboard
const supabaseUrl = 'https://qdalybrlsjlqnfgnpzdu.supabase.co'; // e.g., 'https://your-project.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWx5YnJsc2pscW5mZ25wemR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzI4MDksImV4cCI6MjA4NzQwODgwOX0.QW-Zem0LORZUpyjMw4MPfEsoZ7qHU6kN6nMtVVKDu0w'; // e.g., 'eyJhbGciOiJIUzI1NiIs...'

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// STORAGE CONFIGURATION
// ============================================

// Bucket name for artwork storage
const ARTWORK_BUCKET = 'artworks';

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
  return `artworks/${userId}/${timestamp}-${randomSuffix}.${extension}`;
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Sign up a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - Result with user data or error
 */
async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password
    });
    
    if (error) throw error;
    
    return {
      success: true,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sign in a user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - Result with user data or error
 */
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) throw error;
    
    return {
      success: true,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<Object>} - Result with success or error
 */
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<Object>} - Current user or null
 */
async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Listen for authentication state changes
 * @param {Function} callback - Callback function with user parameter
 * @returns {Function} - Unsubscribe function
 */
function onAuthStateChanged(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      callback(session?.user || null);
    }
  });
}

// ============================================
// DATABASE FUNCTIONS (Supabase PostgtreSQL)
// ============================================

/**
 * Save user profile to database
 * @param {string} userId - User's ID
 * @param {Object} userData - User data to save
 * @returns {Promise<Object>} - Result with saved data or error
 */
async function saveUserProfile(userId, userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'guest',
        createdAt: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Save profile error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user profile from database
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} - User profile data
 */
async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    return { success: true, data: data };
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save artwork to database
 * @param {string} artistId - The artist's user ID
 * @param {Object} artworkData - Artwork data including title, description, image URL
 * @returns {Promise<Object>} - Result with saved artwork or error
 */
async function saveArtworkToDatabase(artistId, artworkData) {
  try {
    const { data, error } = await supabase
      .from('artworks')
      .insert({
        title: artworkData.title,
        description: artworkData.description || '',
        imageUrl: artworkData.imageUrl,
        imagePath: artworkData.imagePath || '',
        artistId: artistId,
        tags: artworkData.tags || [],
        createdAt: new Date().toISOString(),
        isPublic: artworkData.isPublic !== false
      })
      .select();
    
    if (error) throw error;
    
    return {
      success: true,
      id: data[0].id,
      data: data[0]
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
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('artistId', artistId)
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    
    return { success: true, artworks: data };
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
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('isPublic', true)
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    
    return { success: true, artworks: data };
  } catch (error) {
    console.error('Get public artworks error:', error);
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
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) return false;
    return data.role === 'artist';
  } catch (error) {
    console.error('Check artist error:', error);
    return false;
  }
}

// ============================================
// STORAGE FUNCTIONS (Supabase Storage)
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
// COMPLETE ARTWORK UPLOAD FLOW
// ============================================

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
    
    // Step 2: Save artwork metadata to database
    const saveResult = await saveArtworkToDatabase(userId, {
      title: metadata.title,
      description: metadata.description || '',
      imageUrl: uploadResult.url,
      imagePath: uploadResult.path,
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

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function showMessage(message, divId) {
  var messsageDiv = document.getElementById(divId);
  messsageDiv.style.display = 'block';
  messsageDiv.innerHTML = message;
  messsageDiv.style.opacity = 1;
  setTimeout(function() {
    messsageDiv.style.opacity = 0;
  }, 5000);
}

// ============================================
// EVENT LISTENERS FOR AUTH
// ============================================

// Sign Up Event Listener
const signUpButton = document.getElementById('submitSignUp');
if (signUpButton) {
  signUpButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email-sp').value;
    const fName = document.getElementById('fName-sp').value;
    const lName = document.getElementById('lName-sp').value;
    const password = document.getElementById('password-sp').value;

    const result = await signUp(email, password);
    
    if (result.success) {
      showMessage('Account Created Successfully', 'signUpMessage');
      
      // Save user profile
      await saveUserProfile(result.user.id, {
        email: email,
        firstName: fName,
        lastName: lName,
        role: 'guest' // Default role
      });
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      if (result.error.includes('already been registered')) {
        showMessage('Email Address Already Exists', 'signUpMessage');
      } else if (result.error.includes('Password')) {
        showMessage('Password should be at least 6 characters', 'signUpMessage');
      } else if (result.error.includes('invalid email')) {
        showMessage('Invalid email address', 'signUpMessage');
      } else {
        showMessage(result.error, 'signUpMessage');
      }
    }
  });
}

// Sign In Event Listener
const signInButton = document.getElementById('submitSignIn');
if (signInButton) {
  signInButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = document.getElementById('usr-email').value;
    const password = document.getElementById('usr-password').value;

    const result = await signIn(email, password);
    
    if (result.success) {
      showMessage('Login is successful', 'signInMessage');
      localStorage.setItem('loggedInUserId', result.user.id);
      setTimeout(() => {
        window.location.href = 'home2.html';
      }, 1000);
    } else {
      if (result.error.includes('Invalid login') || result.error.includes('invalid-credential')) {
        showMessage('Incorrect Email or Password', 'signInMessage');
      } else {
        showMessage('Account Does Not Exist', 'signInMessage');
      }
    }
  });
}

// ============================================
// ARTWORK UPLOAD HANDLER
// ============================================

/**
 * Setup artwork upload functionality
 * This connects the file input to the upload functions
 */
function setupArtworkUpload() {
  const fileInput = document.getElementById('submContest');
  const userId = localStorage.getItem('loggedInUserId');
  
  if (!fileInput) {
    console.log('Artwork upload input not found on this page');
    return;
  }
  
  if (!userId) {
    console.log('User not logged in');
    return;
  }
  
  // Add event listener for file selection
  fileInput.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }
    
    // Get artwork metadata from form or prompt user
    let title = '';
    let description = '';
    
    // Try to get from form inputs if they exist
    const titleInput = document.getElementById('artworkTitle');
    const descInput = document.getElementById('artworkDescription');
    
    if (titleInput && titleInput.value) {
      title = titleInput.value;
    } else {
      // Prompt user for title if not available
      title = prompt('Enter artwork title:');
      if (!title || title.trim() === '') {
        alert('Title is required');
        return;
      }
    }
    
    if (descInput && descInput.value) {
      description = descInput.value;
    } else {
      // Prompt user for description
      description = prompt('Enter artwork description (optional):') || '';
    }
    
    try {
      // Show loading indicator
      const originalText = fileInput.parentElement.innerText;
      fileInput.parentElement.innerText = 'Uploading...';
      fileInput.disabled = true;
      
      // Check if user is an artist
      const isArtistUser = await checkIsArtist(userId);
      if (!isArtistUser) {
        alert('Only artists can upload artwork. Please contact admin to upgrade your account.');
        fileInput.parentElement.innerText = originalText;
        fileInput.disabled = false;
        return;
      }
      
      // Upload artwork
      const result = await uploadAndSaveArtwork(file, userId, {
        title: title.trim(),
        description: description.trim(),
        tags: [],
        isPublic: true
      });
      
      if (result.success) {
        alert('Artwork uploaded successfully!');
        // Reset form
        fileInput.value = '';
        // Clear preview if exists
        const preview = document.getElementById('uploadPreview');
        if (preview) {
          preview.style.display = 'none';
          preview.src = '';
        }
        // Clear title/description inputs if they exist
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
      } else {
        alert('Upload failed: ' + result.error);
      }
      
      // Restore button state
      fileInput.parentElement.innerText = originalText;
      fileInput.disabled = false;
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
      fileInput.parentElement.innerText = originalText;
      fileInput.disabled = false;
    }
  });
}

// ============================================
// LOGOUT FUNCTION
// ============================================

function logOut() {
  signOut().then(() => {
    localStorage.removeItem('loggedInUserId');
    window.location.href = 'index.html';
  });
}

// ============================================
// AUTH GUARD
// ============================================

function setupAuthGuard() {
  onAuthStateChanged((user) => {
    if (!user) {
      // Not logged in → redirect to login page
      window.location.href = 'index.html';
    } else {
      // Logged in → stay on current page
      console.log('Logged in as:', user.email);
    }
  });
}

// Export for use in other files
window.supabase = supabase;
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.onAuthStateChanged = onAuthStateChanged;
window.saveUserProfile = saveUserProfile;
window.getUserProfile = getUserProfile;
window.uploadArtworkImage = uploadArtworkImage;
window.deleteArtworkImage = deleteArtworkImage;
window.getImageUrl = getImageUrl;
window.saveArtworkToDatabase = saveArtworkToDatabase;
window.getArtworksByArtist = getArtworksByArtist;
window.getPublicArtworks = getPublicArtworks;
window.checkIsArtist = checkIsArtist;
window.uploadAndSaveArtwork = uploadAndSaveArtwork;
window.setupArtworkUpload = setupArtworkUpload;
window.logOut = logOut;
window.setupAuthGuard = setupAuthGuard;
window.showMessage = showMessage;

// ============================================
// AUCTION FUNCTIONS
// ============================================

/**
 * Create a new auction for an artwork
 * @param {string} artistId - The artist's user ID
 * @param {string} artworkId - The artwork ID to auction
 * @param {number} startingPrice - Starting bid price
 * @param {number} durationDays - Auction duration in days
 * @returns {Promise<Object>} - Result with auction data or error
 */
async function createAuction(artistId, artworkId, startingPrice, durationDays = 7) {
  try {
    const auctionEndDate = new Date();
    auctionEndDate.setDate(auctionEndDate.getDate() + durationDays);

    const { data, error } = await supabase
      .from('auctions')
      .insert({
        artworkId: artworkId,
        artistId: artistId,
        startingPrice: startingPrice,
        currentBid: startingPrice,
        highestBidder: null,
        highestBidderEmail: null,
        auctionEndDate: auctionEndDate.toISOString(),
        status: 'active',
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: data };
  } catch (error) {
    console.error('Create auction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all active auctions with artwork details
 * @returns {Promise<Array>} - Array of auction objects with artwork info
 */
async function getAuctions() {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        artworks (
          id,
          title,
          description,
          imageUrl,
          artistId,
          users:artistId (firstName, lastName, email)
        )
      `)
      .eq('status', 'active')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return { success: true, auctions: data };
  } catch (error) {
    console.error('Get auctions error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get auction by ID with artwork details
 * @param {string} auctionId - The auction ID
 * @returns {Promise<Object>} - Auction object with artwork info
 */
async function getAuctionById(auctionId) {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        artworks (
          id,
          title,
          description,
          imageUrl,
          artistId,
          users:artistId (firstName, lastName, email)
        )
      `)
      .eq('id', auctionId)
      .single();

    if (error) throw error;

    return { success: true, auction: data };
  } catch (error) {
    console.error('Get auction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Place a bid on an auction
 * @param {string} auctionId - The auction ID
 * @param {number} bidAmount - The bid amount
 * @param {string} bidderId - The bidder's user ID
 * @param {string} bidderEmail - The bidder's email
 * @returns {Promise<Object>} - Result with updated auction or error
 */
async function placeBid(auctionId, bidAmount, bidderId, bidderEmail) {
  try {
    // First get current auction to validate bid
    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (fetchError) throw fetchError;

    // Check if auction is still active
    if (auction.status !== 'active') {
      return { success: false, error: 'Auction is no longer active' };
    }

    // Check if auction has ended
    const now = new Date();
    const endDate = new Date(auction.auctionEndDate);
    if (now > endDate) {
      return { success: false, error: 'Auction has ended' };
    }

    // Check if bid is higher than current bid
    if (bidAmount <= auction.currentBid) {
      return { success: false, error: 'Bid must be higher than current bid' };
    }

    // Prevent artist from bidding on their own auction
    if (bidderId === auction.artistId) {
      return { success: false, error: 'You cannot bid on your own auction' };
    }

    // Update auction with new bid
    const { data, error } = await supabase
      .from('auctions')
      .update({
        currentBid: bidAmount,
        highestBidder: bidderId,
        highestBidderEmail: bidderEmail,
        updatedAt: new Date().toISOString()
      })
      .eq('id', auctionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: data };
  } catch (error) {
    console.error('Place bid error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get auctions by a specific artist
 * @param {string} artistId - The artist's user ID
 * @returns {Promise<Array>} - Array of auction objects
 */
async function getAuctionsByArtist(artistId) {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        artworks (
          id,
          title,
          description,
          imageUrl
        )
      `)
      .eq('artistId', artistId)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return { success: true, auctions: data };
  } catch (error) {
    console.error('Get artist auctions error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * End an auction (mark as completed)
 * @param {string} auctionId - The auction ID
 * @returns {Promise<Object>} - Result with updated auction or error
 */
async function endAuction(auctionId) {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .update({
        status: 'ended',
        updatedAt: new Date().toISOString()
      })
      .eq('id', auctionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: data };
  } catch (error) {
    console.error('End auction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get auction winner (highest bidder)
 * @param {string} auctionId - The auction ID
 * @returns {Promise<Object>} - Auction with winner info
 */
async function getAuctionWinner(auctionId) {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (error) throw error;

    if (data.highestBidder) {
      return { 
        success: true, 
        winner: {
          userId: data.highestBidder,
          email: data.highestBidderEmail,
          bidAmount: data.currentBid
        }
      };
    } else {
      return { success: true, winner: null };
    }
  } catch (error) {
    console.error('Get winner error:', error);
    return { success: false, error: error.message };
  }
}

// Export auction functions
window.createAuction = createAuction;
window.getAuctions = getAuctions;
window.getAuctionById = getAuctionById;
window.placeBid = placeBid;
window.getAuctionsByArtist = getAuctionsByArtist;
window.endAuction = endAuction;
window.getAuctionWinner = getAuctionWinner;
