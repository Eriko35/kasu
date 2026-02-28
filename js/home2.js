let menuVisible = false;
let themeSwitch = localStorage.getItem('homeTheme');
let bb = document.getElementById('themes');
bb.value = themeSwitch;
var fullAucBox = document.getElementById('fullAucBox');
var fullAuc = document.getElementById('artImg');
// User role tracking
let currentUserRole = null;
let currentUserId = null;

// ============================================
// CUSTOM NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notification container if it doesn't exist
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <span class="notification-close" onclick="this.parentElement.remove()">&times;</span>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
}

// Convenience methods
function showSuccess(message) { showNotification(message, 'success'); }
function showError(message) { showNotification(message, 'error', 6000); }
function showInfo(message) { showNotification(message, 'info'); }
function showWarning(message) { showNotification(message, 'warning', 5000); }

function showMenu() {
    menuVisible = !menuVisible;
    const menuIcon = document.getElementById('menuIcon');
    if (menuVisible) {
        document.getElementById("sideBar").style.display = "flex";
        if (menuIcon) menuIcon.src = "css/icons/menuon.webp";
    } else {
        document.getElementById("sideBar").style.display = "none";
        if (menuIcon) menuIcon.src = "css/icons/menuoff.webp";
    }
}
function removeTheme() {
    document.body.classList.remove('light-theme');
    document.body.classList.remove('pink-theme');
    document.body.classList.remove('ocean-theme');
}
switch(themeSwitch) {
        case 'light':
            document.body.classList.add('light-theme');
            break;
        case 'pink':
            document.body.classList.add('pink-theme');
            break;
        case 'ocean':
            document.body.classList.add('ocean-theme');
            break;
        default:
            localStorage.setItem('homeTheme', 'dark');
    }
function changeTheme() {
    const th = document.getElementById('themes').value;
    switch(th) {
        case 'light':
            removeTheme();
            document.body.classList.add('light-theme');
            localStorage.setItem('homeTheme', 'light');
            break;
        case 'pink':
            removeTheme();
            document.body.classList.add('pink-theme');
            localStorage.setItem('homeTheme', 'pink');
            break;
        case 'ocean':
            removeTheme();
            document.body.classList.add('ocean-theme');
            localStorage.setItem('homeTheme', 'ocean');
            break;
        default:
            removeTheme();
            localStorage.setItem('homeTheme', 'dark');
    }
}
function navIndex(index) {
    document.querySelectorAll('.homeindex').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.navindex').forEach(el => el.classList.remove("active"));
    switch (index) {
        case 1:
            document.getElementById('homef').style.display = 'block';
            document.getElementById('nav1').classList.add("active");
            break;
        case 2:
            document.getElementById('aboutusf').style.display = 'block';
            document.getElementById('nav2').classList.add("active");
            break;
        case 3:
            document.getElementById('auctionf').style.display = 'block';
            document.getElementById('nav3').classList.add("active");
            break;
        case 4:
            document.getElementById('artistf').style.display = 'block';
            document.getElementById('nav4').classList.add("active");
            const artistId = localStorage.getItem('loggedInUserId');
            if (artistId) {
                loadArtistProfile(artistId);
                loadArtistGallery(artistId);
            }
            break;
        case 5:
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('nav5').classList.add("active");
            loadAdminPanel();
            break;
        case 6:
            document.getElementById('artContestSubmit').style.display = 'block';
            document.getElementById('nav6').classList.add("active");
            break;
        case 99:
            document.getElementById('fullAucBox').style.display = 'block';
            document.getElementById('nav4').classList.add("active");
            break;
        case 98:
            document.getElementById('artContestSubmit').style.display = 'block';
            break;
        default:
            document.getElementById('home').style.display = 'block';
            document.getElementById('nav1').classList.add("active");
    }
}

// ============================================
// JOIN CONTEST BUTTON HANDLER
// ============================================
const joinContestBtn = document.getElementById('joinContest');
if (joinContestBtn) {
    joinContestBtn.addEventListener('click', function() {
        // Navigate to contest submission page (case 6)
        navIndex(6);
    });
}
document.querySelectorAll('.aucart').forEach(function(card) {
    card.addEventListener('click', function() {
        const img = this.querySelector('img');
        fullAucBox.style.display = "flex";
        fullAuc.src = img.src;
        navIndex(99);
    });
});
function logOut() {
    // Use Firebase sign out
    signOut(auth).then(() => {
        localStorage.removeItem('loggedInUserId');
        window.location.href = "index.html";
    }).catch((error) => {
        console.error('Sign out error:', error);
        // Still redirect even if there's an error
        localStorage.removeItem('loggedInUserId');
        window.location.href = "index.html";
    });
}
if(!localStorage.getItem('loggedInUserId')) {
    window.location.href = "index.html";
}

// ============================================
// ROLE-BASED VISIBILITY CONTROLLER
// ============================================
async function setupRoleBasedVisibility() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        // Guest user - hide contest features
        hideGuestFeatures();
        return;
    }
    
    try {
        // Get user profile to check role
        const profile = await getUserProfile(userId);
        if (profile.success) {
            currentUserRole = profile.profile.role;
            currentUserId = userId;
            
            if (currentUserRole === 'artist') {
                // Show artist-specific features
                showArtistFeatures();
                // Load contest settings
                loadContestSettings();
            } else if (currentUserRole === 'admin') {
                // Show admin features
                showAdminFeatures();
                // Load contest settings
                loadContestSettings();
            } else {
                // Guest or other role - hide contest features
                hideGuestFeatures();
            }
        } else {
            hideGuestFeatures();
        }
        // Always load settings regardless of role (guests need to see it too)
        loadContestSettings();
    } catch (error) {
        console.error('Error setting up role-based visibility:', error);
        hideGuestFeatures();
    }
}

function hideGuestFeatures() {
    // Hide Join Contest button
    const joinContestBtn = document.getElementById('joinContest');
    if (joinContestBtn) {
        joinContestBtn.style.display = 'none';
    }
    
    // Hide Artist navigation
    const artistNav = document.getElementById('nav4');
    if (artistNav) {
        artistNav.style.display = 'none';
        joinContestBtn.style.display = 'block'
    }
    
    // Hide Contest navigation
    const contestNav = document.getElementById('nav6');
    if (contestNav) {
        contestNav.style.display = 'none';
    }
    
    // Hide Admin Panel navigation
    const adminNav = document.getElementById('nav5');
    if (adminNav) {
        adminNav.style.display = 'none';
    }
}

function showArtistFeatures() {
    // Show Join Contest button for authenticated users
    const joinContestBtn = document.getElementById('joinContest');
    if (joinContestBtn) {
        joinContestBtn.style.display = 'block';
    }
    
    // Show Artist navigation
    const artistNav = document.getElementById('nav4');
    if (artistNav) {
        artistNav.style.display = 'block';
    }
    
    // Show Contest navigation for artists
    const contestNav = document.getElementById('nav6');
    if (contestNav) {
        contestNav.style.display = 'block';
    }
    
    // Show Admin Panel for artists
    const adminNav = document.getElementById('nav5');
    if (adminNav) {
        adminNav.style.display = 'block';
    }
}

function showAdminFeatures() {
    // Show all features for admin
    showArtistFeatures();
    
    // Show edit contest button
    const editBtn = document.getElementById('editContestBtn');
    if (editBtn) editBtn.style.display = 'inline-block';
}

// ============================================
// ADMIN PANEL FUNCTIONS
// ============================================
async function loadAdminPanel() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return;
    
    try {
        // Get all artworks by this artist
        const result = await getArtworksByArtist(userId);
        
        if (result.success) {
            const artworks = result.artworks;
            const totalCount = artworks.length;
            const localCount = artworks.filter(a => a.category === 'local').length;
            const nationalCount = artworks.filter(a => a.category === 'national').length;
            
            // Update stats
            document.getElementById('totalArtworks').textContent = totalCount;
            document.getElementById('localArtworks').textContent = localCount;
            document.getElementById('nationalArtworks').textContent = nationalCount;
            
            // Display artworks list
            const artworksList = document.getElementById('myArtworksList');
            if (artworksList) {
                if (artworks.length === 0) {
                    artworksList.innerHTML = '<p>No artworks uploaded yet.</p>';
                } else {
                    artworksList.innerHTML = artworks.map(artwork => `
                        <div class="artwork-item">
                            <img src="${artwork.imageUrl}" alt="${artwork.title}" style="width: 100px; height: 100px; object-fit: cover;">
                            <div class="artwork-details">
                                <h4>${artwork.title}</h4>
                                <p>Category: ${artwork.category || 'Not specified'}</p>
                                <p>Created: ${new Date(artwork.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div class="artwork-actions">
                                <button class="delete-btn" onclick="deleteArtworkFromAdmin(this, '${artwork.id}')" title="Delete Artwork">
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading admin panel:', error);
    }
}

/**
 * Delete artwork from admin panel
 * @param {HTMLButtonElement} button - The button element that was clicked
 * @param {string} artworkId - The artwork ID to delete
 */
async function deleteArtworkFromAdmin(button, artworkId) {
    // Confirm deletion
    const confirmDelete = confirm('Are you sure you want to delete this artwork? This action cannot be undone.');
    
    if (!confirmDelete) {
        return;
    }

    // Disable button and show loading state
    const originalButtonText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = 'Deleting...';
    
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        showError('You must be logged in to delete artwork.');
        button.disabled = false;
        button.innerHTML = originalButtonText;
        return;
    }
    
    try {
        const result = await deleteArtwork(artworkId, userId);
        
        if (result.success) {
            showSuccess('Artwork deleted successfully!');
            // Refresh the admin panel to update the list.
            // The button will be removed from the DOM during the refresh.
            loadAdminPanel();
        } else {
            showError('Failed to delete artwork: ' + result.error);
            button.disabled = false;
            button.innerHTML = originalButtonText;
        }
    } catch (error) {
        console.error('Delete artwork error:', error);
        showError('An error occurred while deleting the artwork.');
        button.disabled = false;
        button.innerHTML = originalButtonText;
    }
}

// Make function globally available
window.deleteArtworkFromAdmin = deleteArtworkFromAdmin;

// ============================================
// ARTWORK MODAL FUNCTIONS (FULL SCREEN VIEW)
// ============================================

/**
 * Open artwork in full screen modal
 * @param {string} title - Artwork title
 * @param {string} description - Artwork description
 * @param {string} date - Creation date
 * @param {string} imageUrl - URL of the image
 * @param {string} category - Museum category
 */
function viewArtworkFull(title, description, date, imageUrl, category) {
    const modal = document.getElementById('artistArtworkModal');
    if (!modal) return;
    
    const img = document.getElementById('modalArtworkImage');
    const titleEl = document.getElementById('modalArtworkTitle');
    const descEl = document.getElementById('modalArtworkDescription');
    const dateEl = document.getElementById('modalArtworkDate');
    const catEl = document.getElementById('modalArtworkCategory');
    
    if (img) img.src = imageUrl;
    if (titleEl) titleEl.textContent = title || 'Untitled';
    if (descEl) descEl.textContent = description || 'No description available.';
    if (dateEl) dateEl.textContent = 'Created: ' + (date ? date : 'Unknown');
    if (catEl) catEl.textContent = category || 'General Collection';
    
    modal.style.display = 'flex';
}

function closeArtistModal() {
    const modal = document.getElementById('artistArtworkModal');
    if (modal) modal.style.display = 'none';
}

// Close modal when clicking outside the content
window.onclick = function(event) {
    const modal = document.getElementById('artistArtworkModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Make functions globally available
window.viewArtworkFull = viewArtworkFull;
window.closeArtistModal = closeArtistModal;

// ============================================
// ARTIST PROFILE & GALLERY FUNCTIONS
// ============================================

async function loadArtistProfile(userId) {
    try {
        const result = await getUserProfile(userId);
        if (result.success) {
            const profile = result.profile;
            
            // Update header info
            const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Artist';
            document.getElementById('artistName').textContent = name;
            document.getElementById('artistUsername').textContent = `@${profile.username}`;
            document.getElementById('artistBio').textContent = profile.bio || 'No bio available.';
            
            // Update avatar if available
            if (profile.avatarUrl) {
                const avatarImg = document.getElementById('artistAvatar');
                if (avatarImg) {
                    avatarImg.src = profile.avatarUrl;
                }
                // Also update default profile image
                const defaultAvatar = document.querySelector('#artistProfileImageDefault img');
                if (defaultAvatar) {
                    defaultAvatar.src = profile.avatarUrl;
                }
            }
            
            // Update About tab info
            const aboutName = document.getElementById('aboutFullName');
            if(aboutName) aboutName.textContent = name;
            
            const aboutUser = document.getElementById('aboutUsername');
            if(aboutUser) aboutUser.textContent = `@${profile.username}`;
            
            const aboutCat = document.getElementById('aboutCategory');
            if(aboutCat) aboutCat.textContent = profile.category || 'Artist';
            
            const aboutBio = document.getElementById('aboutBio');
            if(aboutBio) aboutBio.textContent = profile.bio || 'No bio available.';
            
            // Load stats
            const artworksResult = await getArtworksByArtist(userId);
            if (artworksResult.success) {
                const artworks = artworksResult.artworks;
                document.getElementById('totalArtworksCount').textContent = artworks.length;
                document.getElementById('localArtworksCount').textContent = artworks.filter(a => a.category === 'local').length;
                document.getElementById('nationalArtworksCount').textContent = artworks.filter(a => a.category === 'national').length;
                
                // Also update exhibition counts
                document.getElementById('localExhibitionCount').textContent = `${artworks.filter(a => a.category === 'local').length} artworks`;
                document.getElementById('nationalExhibitionCount').textContent = `${artworks.filter(a => a.category === 'national').length} artworks`;
            }
            
            // Show profile picture upload button for current user
            await showProfilePictureUploadButton();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadArtistGallery(userId, filter = 'all') {
    const grid = document.getElementById('artistGalleryGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading-spinner">Loading artworks...</div>';
    
    try {
        const result = await getArtworksByArtist(userId);
        
        if (result.success) {
            let artworks = result.artworks;
            
            if (filter !== 'all') {
                artworks = artworks.filter(a => a.category === filter);
            }
            
            if (artworks.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">No artworks found in this category.</p>';
                return;
            }
            
            grid.innerHTML = artworks.map(artwork => {
                // Escape strings for onclick to prevent syntax errors
                const title = (artwork.title || '').replace(/'/g, "\\'");
                const desc = (artwork.description || '').replace(/'/g, "\\'").replace(/\n/g, ' ');
                const date = new Date(artwork.createdAt).toLocaleDateString();
                const category = (artwork.category || 'General').replace(/'/g, "\\'");
                
                return `
                    <div class="gallery-item" onclick="viewArtworkFull('${title}', '${desc}', '${date}', '${artwork.imageUrl}', '${category}')" style="cursor: pointer; position: relative; overflow: hidden; border-radius: 8px; aspect-ratio: 1; background: #333;">
                        <img src="${artwork.imageUrl}" alt="${artwork.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        grid.innerHTML = '<p>Error loading gallery.</p>';
    }
}

function switchArtistTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        if (panel.id === `tab-${tabName}`) panel.classList.add('active');
        else panel.classList.remove('active');
    });
}

function filterGallery(filter) {
    // Update buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    const userId = localStorage.getItem('loggedInUserId');
    if (userId) {
        loadArtistGallery(userId, filter);
    }
}

window.switchArtistTab = switchArtistTab;
window.filterGallery = filterGallery;
window.loadArtistProfile = loadArtistProfile;
window.loadArtistGallery = loadArtistGallery;
window.handleProfilePictureUpload = handleProfilePictureUpload;
window.showProfilePictureUploadButton = showProfilePictureUploadButton;

const input = document.getElementById("submContest");
const preview = document.getElementById("uploadPreview");

input.addEventListener("change", function () {
    const file = this.files[0];

    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
    }
});

// ============================================
// ARTWORK UPLOAD HANDLER (Firebase Auth + Supabase Storage)
// ============================================

const artContestForm = document.getElementById('art-contest-submit');
if (artContestForm) {
    artContestForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('submContest');
        const titleInput = document.getElementById('contestSubmitTitle');
        const descInput = document.getElementById('contestSubmitDesc');
        const file = fileInput.files[0];
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        const category = 'local';
        
        // Validation
        if (!file) {
            showError('Please select an image file to upload.');
            return;
        }
        
        if (!title) {
            showError('Please enter a title for your artwork.');
            return;
        }
        
        // Get the authenticated user from Firebase
        const user = auth.currentUser;
        
        if (!user) {
            showError('You must be logged in to upload artwork.');
            window.location.href = 'index.html';
            return;
        }
        
        const userId = user.uid;
        
        // Show loading state
        const submitBtn = artContestForm.querySelector('button');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Uploading...';
        submitBtn.disabled = true;
        
        try {
            // Check if user is an artist using Firestore
            const isArtistUser = await checkIsArtist(userId);
            const isAdminUser = await checkIsAdmin(userId);
            if (!isArtistUser && !isAdminUser) {
                showError('Only artists and admins can upload artwork.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }
            
            // Upload image to Supabase Storage with category
            const uploadResult = await uploadArtworkImage(file, userId, category);
            
            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }
            
            // Save artwork to Firestore with category
            const saveResult = await saveArtworkToFirestore(userId, {
                title: title,
                description: description,
                imageUrl: uploadResult.url,
                imagePath: uploadResult.path,
                category: category,
                isPublic: true
            });
            
            if (saveResult.success) {
                showSuccess('Artwork uploaded successfully to ' + (category === 'local' ? 'Local Museum!' : 'National Museum!'));
                // Reset the form
                artContestForm.reset();
                preview.style.display = 'none';
                preview.src = '';
            } else {
                // Delete uploaded image if save failed
                await deleteArtworkImage(uploadResult.path);
                throw new Error(saveResult.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            showError('An error occurred during upload: ' + error.message);
        } finally {
            // Restore button state
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// ============================================
// CONTEST SETTINGS MANAGEMENT
// ============================================

async function loadContestSettings() {
    try {
        const result = await getWebsiteSettings();
        if (result.success) {
            const { title, deadline } = result.data;
            if (title) {
                // Update all instances of contestTitle (handling duplicate IDs in HTML)
                document.querySelectorAll('#contestTitle').forEach(el => el.textContent = title);
            }
            if (deadline) {
                const deadlineEl = document.getElementById('deadlineDate');
                if (deadlineEl) deadlineEl.textContent = deadline;
            }
        }
    } catch (error) {
        console.error('Error loading contest settings:', error);
    }
}

function openContestEditModal() {
    // Get current values
    const titleEl = document.getElementById('contestTitle');
    const deadlineEl = document.getElementById('deadlineDate');
    
    if (titleEl) document.getElementById('editContestTitle').value = titleEl.textContent;
    if (deadlineEl) document.getElementById('editContestDeadline').value = deadlineEl.textContent;
    
    document.getElementById('contestEditModal').style.display = 'flex';
}

function closeContestEditModal() {
    document.getElementById('contestEditModal').style.display = 'none';
}

const contestEditForm = document.getElementById('contestEditForm');
if (contestEditForm) {
    contestEditForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newTitle = document.getElementById('editContestTitle').value;
        const newDeadline = document.getElementById('editContestDeadline').value;
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        
        try {
            const result = await updateWebsiteSettings({
                title: newTitle,
                deadline: newDeadline
            });
            
            if (result.success) {
                showSuccess('Contest details updated successfully!');
                // Reload settings to update UI
                loadContestSettings();
                closeContestEditModal();
            } else {
                showError('Failed to update settings: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            showError('An error occurred.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

window.openContestEditModal = openContestEditModal;
window.closeContestEditModal = closeContestEditModal;

// ============================================
// INITIALIZE ROLE-BASED VISIBILITY
// ============================================
// Run after Firebase is initialized
if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await setupRoleBasedVisibility();
        } else {
            hideGuestFeatures();
        }
    });
} else {
    // If auth not available yet, check after a delay
    setTimeout(async () => {
        await setupRoleBasedVisibility();
    }, 1000);
}

// ============================================
// PROFILE PICTURE UPLOAD FUNCTIONS
// ============================================

/**
 * Handle profile picture file selection
 * @param {Event} event - File input change event
 */
async function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    const validation = validateProfilePicture(file);
    if (!validation.isValid) {
        showError(validation.error);
        // Reset input
        event.target.value = '';
        return;
    }
    
    // Get current user
    const user = auth.currentUser;
    if (!user) {
        showError('You must be logged in to update your profile picture.');
        return;
    }
    
    const userId = user.uid;
    
    // Show loading state
    const loadingEl = document.getElementById('profilePictureLoading');
    const wrapper = document.getElementById('profilePictureWrapper');
    if (loadingEl) loadingEl.style.display = 'flex';
    
    try {
        // Get current avatar path for deletion later
        const profile = await getUserProfile(userId);
        const oldAvatarPath = profile.success && profile.profile.avatarUrl ? null : null; // We'll store path separately if needed
        
        // Upload and update profile picture using the integrated function
        const result = await uploadAndUpdateProfilePicture(file, userId);
        
        if (result.success) {
            // Update the displayed avatar
            const avatarImg = document.getElementById('artistAvatar');
            if (avatarImg) {
                // Add timestamp to prevent caching
                avatarImg.src = result.avatarUrl + '?t=' + Date.now();
            }
            
            // Also update the default display if it exists
            const defaultAvatar = document.querySelector('#artistProfileImageDefault img');
            if (defaultAvatar) {
                defaultAvatar.src = result.avatarUrl + '?t=' + Date.now();
            }
            
            showSuccess('Profile picture updated successfully!');
        } else {
            showError('Failed to update profile picture: ' + result.error);
        }
    } catch (error) {
        console.error('Profile picture upload error:', error);
        showError('An error occurred: ' + error.message);
    } finally {
        // Hide loading state
        if (loadingEl) loadingEl.style.display = 'none';
        // Reset input
        event.target.value = '';
    }
}

/**
 * Show the profile picture upload button for the current user's profile
 * Called when the artist profile is loaded
 */
async function showProfilePictureUploadButton() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        // Get the current profile being viewed
        const profileWrapper = document.getElementById('profilePictureWrapper');
        const defaultProfile = document.getElementById('artistProfileImageDefault');
        
        // Get the displayed user ID from the page
        const artistAvatar = document.getElementById('artistAvatar');
        
        // Check if current user is viewing their own profile
        // by comparing with the logged-in user
        const profileResult = await getUserProfile(user.uid);
        
        if (profileResult.success) {
            const profile = profileResult.profile;
            
            // If user is viewing their own profile, show upload button
            // Also check if there's a displayed user ID to compare
            if (profile && profile.uid === user.uid) {
                if (profileWrapper) {
                    profileWrapper.style.display = 'block';
                }
                if (defaultProfile) {
                    defaultProfile.style.display = 'none';
                }
                
                // If there's an existing avatar URL, display it
                if (profile.avatarUrl) {
                    if (artistAvatar) {
                        artistAvatar.src = profile.avatarUrl;
                    }
                }
            } else {
                // Show default profile image for other users
                if (profileWrapper) {
                    profileWrapper.style.display = 'none';
                }
                if (defaultProfile) {
                    defaultProfile.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('Error showing profile picture upload button:', error);
    }
}

// ============================================
// FEATURED ARTWORKS LOADER
// ============================================

async function loadFeaturedArtworks() {
    // Wait for Firebase functions to be available
    if (typeof window.getPublicArtworks !== 'function') {
        setTimeout(loadFeaturedArtworks, 500);
        return;
    }

    try {
        // Get local museum artworks
        const result = await window.getPublicArtworks('local');
        
        if (result.success && result.artworks && result.artworks.length > 0) {
            // Take top 3
            const featured = result.artworks.slice(0, 3);
            const artworkDivs = document.querySelectorAll('.featured-artworks .artwork');
            
            featured.forEach((art, index) => {
                if (index < artworkDivs.length) {
                    const div = artworkDivs[index];
                    const img = div.querySelector('img');
                    
                    if (img) {
                        img.src = art.imageUrl;
                        img.alt = art.title;
                    }
                    
                    // Update onclick
                    const title = (art.title || '').replace(/'/g, "\\'");
                    const desc = (art.description || '').replace(/'/g, "\\'").replace(/\n/g, ' ');
                    const date = new Date(art.createdAt).getFullYear();
                    
                    div.setAttribute('onclick', `viewArtworkFull('${title}', '${desc}', '${date}', '${art.imageUrl}', 'Local Museum')`);
                }
            });
        }
    } catch (error) {
        console.error('Error loading featured artworks:', error);
    }
}

// Initialize featured artworks
loadFeaturedArtworks();
