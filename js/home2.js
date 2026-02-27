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
        if (menuIcon) menuIcon.src = "css/icons/menuoff.webp";
    } else {
        document.getElementById("sideBar").style.display = "none";
        if (menuIcon) menuIcon.src = "css/icons/menuon.webp";
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
            // Load artist page data when navigating to artist tab
            loadArtistPage();
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
        // Guest user - hide contest features completely
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
            } else if (currentUserRole === 'admin') {
                // Show admin features
                showAdminFeatures();
            } else if (currentUserRole === 'guest') {
                // Guest role - hide contest features completely
                hideGuestFeatures();
            } else {
                // Unknown role - hide contest features
                hideGuestFeatures();
            }
        } else {
            hideGuestFeatures();
        }
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
    
    // Hide the entire contest section on home page
    const contestSection = document.querySelector('.home-section');
    if (contestSection) {
        contestSection.style.display = 'none';
    }
    
    // Hide Artist navigation
    const artistNav = document.getElementById('nav4');
    if (artistNav) {
        artistNav.style.display = 'none';
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
    
    // Also hide the contest section div directly if it exists
    const contestf = document.getElementById('constestf');
    if (contestf) {
        contestf.style.display = 'none';
    }
}

function showArtistFeatures() {
    // Show Join Contest button for authenticated users (artist role)
    const joinContestBtn = document.getElementById('joinContest');
    if (joinContestBtn) {
        joinContestBtn.style.display = 'block';
    }
    
    // Show the entire contest section on home page for artists
    const contestSection = document.querySelector('.home-section');
    if (contestSection) {
        contestSection.style.display = 'block';
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
                            <div>
                                <h4>${artwork.title}</h4>
                                <p>Category: ${artwork.category || 'Not specified'}</p>
                                <p>Created: ${new Date(artwork.createdAt).toLocaleDateString()}</p>
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
        const categoryInput = document.getElementById('artCategory');
        const file = fileInput.files[0];
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        const category = categoryInput ? categoryInput.value : 'local';
        
        // Validation
        if (!file) {
            showError('Please select an image file to upload.');
            return;
        }
        
        if (!title) {
            showError('Please enter a title for your artwork.');
            return;
        }
        
        // Validate category selection
        if (!category) {
            showError('Please select a category (Local or National Museum).');
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
            if (!isArtistUser) {
                showError('Only artists can upload artwork. Please contact admin to upgrade your account.');
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
// INITIALIZE ROLE-BASED VISIBILITY
// ============================================
// Hide contest by default on page load for guests
(function() {
    // Initially hide contest section for guests (until authentication is checked)
    const contestSection = document.querySelector('.home-section');
    if (contestSection) {
        contestSection.style.display = 'none';
    }
})();

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
// ARTIST PAGE FUNCTIONS
// ============================================

// Current artist data
let currentArtistData = null;
let artistArtworks = [];
let currentFilter = 'all';

/**
 * Switch between artist page tabs
 * @param {string} tabName - The tab name to switch to
 */
function switchArtistTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.artist-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab panels
    document.querySelectorAll('.artist-tab-content .tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById('tab-' + tabName).classList.add('active');
    
    // Load tab content if needed
    if (tabName === 'gallery') {
        renderArtistGallery();
    }
}

/**
 * Filter gallery by category
 * @param {string} filter - Filter category ('all', 'local', 'national')
 */
function filterGallery(filter) {
    currentFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.gallery-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    // Re-render gallery with filter
    renderArtistGallery();
}

/**
 * Load artist profile and artworks
 * @param {string} artistId - The artist's user ID (optional, defaults to current user)
 */
async function loadArtistPage(artistId = null) {
    const userId = artistId || localStorage.getItem('loggedInUserId');
    
    if (!userId) {
        showError('Please log in to view artist profile');
        return;
    }
    
    try {
        // Get artist profile
        const profileResult = await getUserProfile(userId);
        
        if (profileResult.success) {
            currentArtistData = profileResult.profile;
            updateArtistHeader(currentArtistData);
            updateArtistAbout(currentArtistData);
        } else {
            // Use default data if profile not found
            currentArtistData = {
                firstName: 'Artist',
                lastName: 'Name',
                username: 'artist',
                bio: 'No bio available',
                role: 'artist',
                createdAt: new Date().toISOString()
            };
            updateArtistHeader(currentArtistData);
            updateArtistAbout(currentArtistData);
        }
        
        // Get artist artworks
        const artworksResult = await getArtworksByArtist(userId);
        
        if (artworksResult.success) {
            artistArtworks = artworksResult.artworks;
            updateArtistStats(artistArtworks);
            renderArtistGallery();
            updateExhibitions(artistArtworks);
        } else {
            artistArtworks = [];
            updateArtistStats([]);
            renderArtistGallery();
        }
        
    } catch (error) {
        console.error('Error loading artist page:', error);
        showError('Failed to load artist profile');
    }
}

/**
 * Update artist header with profile data
 * @param {Object} profile - Artist profile data
 */
function updateArtistHeader(profile) {
    // Update name
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    document.getElementById('artistName').textContent = fullName || 'Artist Name';
    
    // Update username
    document.getElementById('artistUsername').textContent = '@' + (profile.username || 'artist');
    
    // Update bio
    document.getElementById('artistBio').textContent = profile.bio || 'No bio available';
    
    // Update avatar
    if (profile.avatarUrl) {
        document.getElementById('artistAvatar').src = profile.avatarUrl;
    }
}

/**
 * Update artist about section
 * @param {Object} profile - Artist profile data
 */
function updateArtistAbout(profile) {
    // Full name
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    document.getElementById('aboutFullName').textContent = fullName || 'Not specified';
    
    // Username
    document.getElementById('aboutUsername').textContent = '@' + (profile.username || 'artist');
    
    // Member since
    if (profile.createdAt) {
        const memberDate = new Date(profile.createdAt);
        document.getElementById('aboutMemberSince').textContent = memberDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    } else {
        document.getElementById('aboutMemberSince').textContent = 'Unknown';
    }
    
    // Category
    document.getElementById('aboutCategory').textContent = profile.category || 'Artist';
    
    // Bio
    document.getElementById('aboutBio').textContent = profile.bio || 'No bio available';
}

/**
 * Update artist statistics
 * @param {Array} artworks - Array of artwork objects
 */
function updateArtistStats(artworks) {
    const total = artworks.length;
    const local = artworks.filter(a => a.category === 'local').length;
    const national = artworks.filter(a => a.category === 'national').length;
    
    document.getElementById('totalArtworksCount').textContent = total;
    document.getElementById('localArtworksCount').textContent = local;
    document.getElementById('nationalArtworksCount').textContent = national;
}

/**
 * Update exhibitions section
 * @param {Array} artworks - Array of artwork objects
 */
function updateExhibitions(artworks) {
    const local = artworks.filter(a => a.category === 'local').length;
    const national = artworks.filter(a => a.category === 'national').length;
    
    document.getElementById('localExhibitionCount').textContent = local + ' artwork' + (local !== 1 ? 's' : '');
    document.getElementById('nationalExhibitionCount').textContent = national + ' artwork' + (national !== 1 ? 's' : '');
}

/**
 * Render artist gallery with filter
 */
function renderArtistGallery() {
    const galleryGrid = document.getElementById('artistGalleryGrid');
    
    if (!galleryGrid) return;
    
    // Filter artworks
    let filteredArtworks = artistArtworks;
    if (currentFilter !== 'all') {
        filteredArtworks = artistArtworks.filter(a => a.category === currentFilter);
    }
    
    // Check if empty
    if (filteredArtworks.length === 0) {
        galleryGrid.innerHTML = `
            <div class="empty-gallery">
                <p>No artworks found</p>
                <p class="empty-subtext">Upload your first artwork to get started!</p>
            </div>
        `;
        return;
    }
    
    // Render artworks
    galleryGrid.innerHTML = filteredArtworks.map(artwork => `
        <div class="gallery-item" onclick="openArtistArtworkModal('${artwork.id}')">
            <div class="gallery-item-image">
                <img src="${artwork.imageUrl}" alt="${artwork.title}" loading="lazy">
                <div class="gallery-item-overlay">
                    <span class="view-btn">View Details</span>
                </div>
            </div>
            <div class="gallery-item-info">
                <h3>${artwork.title}</h3>
                <span class="category-badge ${artwork.category}">${artwork.category === 'local' ? 'Local Museum' : 'National Museum'}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Open artwork detail modal
 * @param {string} artworkId - The artwork ID
 */
function openArtistArtworkModal(artworkId) {
    const artwork = artistArtworks.find(a => a.id === artworkId);
    
    if (!artwork) {
        showError('Artwork not found');
        return;
    }
    
    // Update modal content
    document.getElementById('modalArtworkImage').src = artwork.imageUrl;
    document.getElementById('modalArtworkTitle').textContent = artwork.title;
    document.getElementById('modalArtworkCategory').textContent = artwork.category === 'local' ? 'Local Museum' : 'National Museum';
    document.getElementById('modalArtworkDescription').textContent = artwork.description || 'No description available';
    
    if (artwork.createdAt) {
        const createdDate = new Date(artwork.createdAt);
        document.getElementById('modalArtworkDate').textContent = 'Created: ' + createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        document.getElementById('modalArtworkDate').textContent = 'Created: Unknown';
    }
    
    // Show modal
    document.getElementById('artistArtworkModal').style.display = 'flex';
}

/**
 * Close artist artwork modal
 */
function closeArtistModal() {
    document.getElementById('artistArtworkModal').style.display = 'none';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('artistArtworkModal');
    if (e.target === modal) {
        closeArtistModal();
    }
});

// Make functions globally available
window.switchArtistTab = switchArtistTab;
window.filterGallery = filterGallery;
window.loadArtistPage = loadArtistPage;
window.openArtistArtworkModal = openArtistArtworkModal;
window.closeArtistModal = closeArtistModal;
