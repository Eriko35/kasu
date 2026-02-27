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
            } else if (currentUserRole === 'admin') {
                // Show admin features
                showAdminFeatures();
            } else {
                // Guest or other role - hide contest features
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
