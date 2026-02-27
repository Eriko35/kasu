/**
 * Artist Bio Manager Module
 * Handles bio editing, version history, and preview functionality
 * Integrates with Firebase Firestore for data persistence
 */

// ============================================
// BIO CONFIGURATION
// ============================================

const BIO_COLLECTION = 'artist_bios';
const BIO_VERSION_COLLECTION = 'bio_versions';
const MAX_BIO_LENGTH = 2000; // Maximum characters
const MAX_VERSION_HISTORY = 10; // Keep last 10 versions

// ============================================
// BIO DATA STRUCTURE
// ============================================

/**
 * Bio document structure:
 * {
 *   userId: string,
 *   bio: string,
 *   updatedAt: timestamp,
 *   createdAt: timestamp,
 *   isPublished: boolean
 * }
 * 
 * Version document structure:
 * {
 *   userId: string,
 *   bio: string,
 *   versionNumber: number,
 *   createdAt: timestamp,
 *   isPublished: boolean
 * }
 */

// ============================================
// BIO CRUD OPERATIONS
// ============================================

/**
 * Get the current artist's bio
 * @param {string} userId - The artist's user ID
 * @returns {Promise<Object>} - Bio data or null
 */
async function getArtistBio(userId) {
    try {
        if (!userId) {
            console.error('No userId provided');
            return null;
        }

        const bioRef = doc(db, BIO_COLLECTION, userId);
        const bioSnap = await getDoc(bioRef);

        if (bioSnap.exists()) {
            const data = bioSnap.data();
            return {
                id: bioSnap.id,
                bio: data.bio || '',
                updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
                createdAt: data.createdAt ? data.createdAt.toDate() : null,
                isPublished: data.isPublished || false
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting artist bio:', error);
        return null;
    }
}

/**
 * Save artist's bio (creates or updates)
 * @param {string} userId - The artist's user ID
 * @param {string} bioContent - The bio content
 * @param {boolean} publish - Whether to publish immediately
 * @returns {Promise<Object>} - Result with success or error
 */
async function saveArtistBio(userId, bioContent, publish = true) {
    try {
        if (!userId) {
            return { success: false, error: 'User ID is required' };
        }

        if (bioContent.length > MAX_BIO_LENGTH) {
            return { success: false, error: 'Bio too long. Maximum ' + MAX_BIO_LENGTH + ' characters allowed.' };
        }

        const now = new Date();
        const bioRef = doc(db, BIO_COLLECTION, userId);
        const bioSnap = await getDoc(bioRef);

        // Get current version number
        let versionNumber = 1;
        if (bioSnap.exists()) {
            const currentData = bioSnap.data();
            versionNumber = (currentData.versionNumber || 0) + 1;

            // Save current version to history before updating
            if (currentData.bio && currentData.bio !== bioContent) {
                await saveBioVersion(userId, currentData.bio, currentData.versionNumber || 1, currentData.isPublished);
            }
        }

        // Update or create the bio
        const bioData = {
            bio: bioContent,
            updatedAt: now,
            isPublished: publish,
            versionNumber: versionNumber
        };

        if (!bioSnap.exists()) {
            bioData.createdAt = now;
            bioData.userId = userId;
        }

        await setDoc(bioRef, bioData, { merge: true });

        // Clean up old versions
        await cleanupOldVersions(userId);

        // Update UI elements
        await updateArtistBioDisplay(userId);

        return {
            success: true,
            bio: bioContent,
            versionNumber: versionNumber,
            updatedAt: now
        };
    } catch (error) {
        console.error('Error saving artist bio:', error);
        return { success: false, error: error.message || 'Failed to save bio' };
    }
}

/**
 * Save bio as draft without publishing
 * @param {string} userId - The artist's user ID
 * @param {string} bioContent - The bio content
 * @returns {Promise<Object>} - Result with success or error
 */
async function saveBioDraft(userId, bioContent) {
    try {
        if (!userId) {
            return { success: false, error: 'User ID is required' };
        }

        if (bioContent.length > MAX_BIO_LENGTH) {
            return { success: false, error: 'Bio too long. Maximum ' + MAX_BIO_LENGTH + ' characters allowed.' };
        }

        const now = new Date();
        const bioRef = doc(db, BIO_COLLECTION, userId);
        
        const bioData = {
            bio: bioContent,
            updatedAt: now,
            isPublished: false,
            isDraft: true
        };

        await setDoc(bioRef, bioData, { merge: true });

        return {
            success: true,
            bio: bioContent,
            isDraft: true,
            updatedAt: now
        };
    } catch (error) {
        console.error('Error saving bio draft:', error);
        return { success: false, error: error.message || 'Failed to save draft' };
    }
}

/**
 * Publish a draft bio
 * @param {string} userId - The artist's user ID
 * @returns {Promise<Object>} - Result with success or error
 */
async function publishBio(userId) {
    try {
        if (!userId) {
            return { success: false, error: 'User ID is required' };
        }

        const bioRef = doc(db, BIO_COLLECTION, userId);
        const bioSnap = await getDoc(bioRef);

        if (!bioSnap.exists()) {
            return { success: false, error: 'No bio found' };
        }

        const currentData = bioSnap.data();
        
        // Save to version history
        await saveBioVersion(userId, currentData.bio, currentData.versionNumber || 1, true);

        await updateDoc(bioRef, {
            isPublished: true,
            isDraft: false,
            updatedAt: new Date()
        });

        // Update UI
        await updateArtistBioDisplay(userId);

        return { success: true };
    } catch (error) {
        console.error('Error publishing bio:', error);
        return { success: false, error: error.message || 'Failed to publish bio' };
    }
}

// ============================================
// VERSION HISTORY OPERATIONS
// ============================================

/**
 * Save a version to the history
 * @param {string} userId - The artist's user ID
 * @param {string} bioContent - The bio content
 * @param {number} versionNumber - The version number
 * @param {boolean} isPublished - Whether this version was published
 */
async function saveBioVersion(userId, bioContent, versionNumber, isPublished) {
    try {
        const versionRef = doc(collection(db, BIO_VERSION_COLLECTION));
        await setDoc(versionRef, {
            userId: userId,
            bio: bioContent,
            versionNumber: versionNumber,
            isPublished: isPublished,
            createdAt: new Date()
        });
    } catch (error) {
        console.error('Error saving bio version:', error);
    }
}

/**
 * Get bio version history
 * @param {string} userId - The artist's user ID
 * @returns {Promise<Array>} - Array of version history
 */
async function getBioVersionHistory(userId) {
    try {
        if (!userId) {
            return [];
        }

        const versionsQuery = query(
            collection(db, BIO_VERSION_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(versionsQuery);
        const versions = [];

        querySnapshot.forEach(function(doc) {
            const data = doc.data();
            versions.push({
                id: doc.id,
                bio: data.bio,
                versionNumber: data.versionNumber,
                isPublished: data.isPublished,
                createdAt: data.createdAt ? data.createdAt.toDate() : null
            });
        });

        return versions;
    } catch (error) {
        console.error('Error getting bio version history:', error);
        return [];
    }
}

/**
 * Restore a specific bio version
 * @param {string} userId - The artist's user ID
 * @param {string} versionId - The version ID to restore
 * @returns {Promise<Object>} - Result with success or error
 */
async function restoreBioVersion(userId, versionId) {
    try {
        if (!userId || !versionId) {
            return { success: false, error: 'User ID and version ID are required' };
        }

        const versionRef = doc(db, BIO_VERSION_COLLECTION, versionId);
        const versionSnap = await getDoc(versionRef);

        if (!versionSnap.exists()) {
            return { success: false, error: 'Version not found' };
        }

        const versionData = versionSnap.data();
        
        // Save the current bio as a version before restoring
        const currentBio = await getArtistBio(userId);
        if (currentBio && currentBio.bio) {
            await saveBioVersion(userId, currentBio.bio, currentBio.versionNumber || 1, currentBio.isPublished);
        }

        // Restore the version
        const result = await saveArtistBio(userId, versionData.bio, versionData.isPublished);

        return result;
    } catch (error) {
        console.error('Error restoring bio version:', error);
        return { success: false, error: error.message || 'Failed to restore version' };
    }
}

/**
 * Clean up old versions, keeping only the most recent ones
 * @param {string} userId - The artist's user ID
 */
async function cleanupOldVersions(userId) {
    try {
        const versions = await getBioVersionHistory(userId);
        
        if (versions.length > MAX_VERSION_HISTORY) {
            const versionsToDelete = versions.slice(MAX_VERSION_HISTORY);
            
            for (let i = 0; i < versionsToDelete.length; i++) {
                await deleteDoc(doc(db, BIO_VERSION_COLLECTION, versionsToDelete[i].id));
            }
        }
    } catch (error) {
        console.error('Error cleaning up old versions:', error);
    }
}

// ============================================
// PREVIEW MODE
// ============================================

/**
 * Preview mode state
 */
var previewMode = false;
var previewBioContent = '';

/**
 * Enter preview mode with given bio content
 * @param {string} bioContent - The bio content to preview
 */
function enterPreviewMode(bioContent) {
    previewMode = true;
    previewBioContent = bioContent;
    
    // Update preview element
    var previewElement = document.getElementById('bioPreviewContent');
    if (previewElement) {
        previewElement.innerHTML = formatBioContent(previewBioContent);
    }

    // Show preview panel, hide edit panel
    var editPanel = document.getElementById('bioEditPanel');
    var previewPanel = document.getElementById('bioPreviewPanel');
    
    if (editPanel) editPanel.style.display = 'none';
    if (previewPanel) previewPanel.style.display = 'block';

    // Update button states
    updatePreviewButtons(true);
}

/**
 * Enter preview mode with given bio content
 */
function previewBio() {
    var textarea = document.getElementById('bioEditorTextarea');
    if (textarea) {
        enterPreviewMode(textarea.value);
    }
}

/**
 * Exit preview mode and return to edit mode
 */
function exitPreviewMode() {
    previewMode = false;
    
    // Show edit panel, hide preview panel
    var editPanel = document.getElementById('bioEditPanel');
    var previewPanel = document.getElementById('bioPreviewPanel');
    
    if (editPanel) editPanel.style.display = 'block';
    if (previewPanel) previewPanel.style.display = 'none';

    // Update button states
    updatePreviewButtons(false);
}

/**
 * Update preview button states
 * @param {boolean} isPreview - Whether in preview mode
 */
function updatePreviewButtons(isPreview) {
    var previewBtn = document.getElementById('previewBioBtn');
    var editBtn = document.getElementById('backToEditBtn');
    var saveBtn = document.getElementById('saveBioBtn');
    var publishBtn = document.getElementById('publishBioBtn');

    if (previewBtn) previewBtn.style.display = isPreview ? 'none' : 'inline-block';
    if (editBtn) editBtn.style.display = isPreview ? 'inline-block' : 'none';
    
    // Disable save/publish in preview mode
    if (saveBtn) saveBtn.disabled = isPreview;
    if (publishBtn) publishBtn.disabled = isPreview;
}

/**
 * Format bio content with basic markdown-like styling
 * @param {string} content - Raw bio content
 * @returns {string} - Formatted HTML
 */
function formatBioContent(content) {
    if (!content) return '';
    
    // Escape HTML
    var formatted = content
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>');

    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');

    // Bold text (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic text (*text*)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return formatted;
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

/**
 * Update all artist bio displays across the interface
 * @param {string} userId - The artist's user ID
 */
async function updateArtistBioDisplay(userId) {
    try {
        var bio = await getArtistBio(userId);
        
        if (!bio) return;

        // Update profile bio
        var profileBioElement = document.getElementById('artistBio');
        if (profileBioElement) {
            profileBioElement.textContent = bio.bio || 'No bio yet. Click edit to add your biography.';
        }

        // Update about section bio
        var aboutBioElement = document.getElementById('aboutBio');
        if (aboutBioElement) {
            aboutBioElement.textContent = bio.bio || 'No bio added yet.';
        }

        // Update portfolio bio if exists
        var portfolioBioElement = document.getElementById('portfolioBio');
        if (portfolioBioElement) {
            portfolioBioElement.textContent = bio.bio || 'No bio available.';
        }

        // Update account settings bio if exists
        var settingsBioElement = document.getElementById('settingsBio');
        if (settingsBioElement) {
            settingsBioElement.textContent = bio.bio || 'No bio set.';
        }

        // Update last updated timestamp
        var lastUpdatedElement = document.getElementById('bioLastUpdated');
        if (lastUpdatedElement && bio.updatedAt) {
            lastUpdatedElement.textContent = formatDate(bio.updatedAt);
        }

        // Update version indicator
        var versionElement = document.getElementById('bioVersionNumber');
        if (versionElement) {
            versionElement.textContent = 'Version ' + (bio.versionNumber || 1);
        }

        // Dispatch custom event for other components to react
        window.dispatchEvent(new CustomEvent('bioUpdated', { detail: bio }));
    } catch (error) {
        console.error('Error updating artist bio display:', error);
    }
}

/**
 * Format date for display
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    if (!date) return 'Unknown';
    
    var options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', options);
}

// ============================================
// MODAL UI FUNCTIONS
// ============================================

/**
 * Open the bio editor modal
 */
async function openBioEditor() {
    var userId = localStorage.getItem('loggedInUserId');
    
    if (!userId) {
        showNotification('Please log in to edit your bio', 'error');
        return;
    }

    var modal = document.getElementById('bioEditorModal');
    var textarea = document.getElementById('bioEditorTextarea');
    var charCount = document.getElementById('bioCharCount');
    
    if (!modal || !textarea) {
        console.error('Bio editor modal elements not found');
        return;
    }

    // Load current bio
    var bio = await getArtistBio(userId);
    textarea.value = bio ? bio.bio : '';
    
    // Update character count
    if (charCount) {
        charCount.textContent = textarea.value.length + '/' + MAX_BIO_LENGTH;
    }

    // Reset to edit mode
    exitPreviewMode();

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close the bio editor modal
 */
function closeBioEditor() {
    var modal = document.getElementById('bioEditorModal');
    if (modal) {
        modal.style.display = 'none';
    }
    exitPreviewMode();
}

/**
 * Open version history modal
 */
async function openVersionHistory() {
    var userId = localStorage.getItem('loggedInUserId');
    
    if (!userId) {
        showNotification('Please log in to view version history', 'error');
        return;
    }

    var modal = document.getElementById('versionHistoryModal');
    var listContainer = document.getElementById('versionHistoryList');
    
    if (!modal || !listContainer) {
        console.error('Version history modal elements not found');
        return;
    }

    // Load version history
    var versions = await getBioVersionHistory(userId);
    
    if (versions.length === 0) {
        listContainer.innerHTML = '<p class="no-versions">No version history available.</p>';
    } else {
        listContainer.innerHTML = versions.map(function(version) {
            return '<div class="version-item" data-version-id="' + version.id + '">' +
                '<div class="version-header">' +
                    '<span class="version-number">Version ' + version.versionNumber + '</span>' +
                    '<span class="version-status ' + (version.isPublished ? 'published' : 'draft') + '">' +
                        (version.isPublished ? 'Published' : 'Draft') +
                    '</span>' +
                '</div>' +
                '<div class="version-date">' + formatDate(version.createdAt) + '</div>' +
                '<div class="version-preview">' + version.bio.substring(0, 100) + (version.bio.length > 100 ? '...' : '') + '</div>' +
                '<div class="version-actions">' +
                    '<button class="btn-restore" onclick="restoreBioVersion(\'' + userId + '\', \'' + version.id + '\')">Restore</button>' +
                    '<button class="btn-view" onclick="viewVersionDetails(\'' + version.id + '\')">View</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close version history modal
 */
function closeVersionHistory() {
    var modal = document.getElementById('versionHistoryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * View full version details
 * @param {string} versionId - The version ID
 */
async function viewVersionDetails(versionId) {
    try {
        var versionRef = doc(db, BIO_VERSION_COLLECTION, versionId);
        var versionSnap = await getDoc(versionRef);
        
        if (!versionSnap.exists()) {
            showNotification('Version not found', 'error');
            return;
        }

        var version = versionSnap.data();
        
        // Show in a simple alert
        alert('Version ' + version.versionNumber + '\n\n' + version.bio);
    } catch (error) {
        console.error('Error viewing version details:', error);
        showNotification('Failed to load version details', 'error');
    }
}

/**
 * Save bio from the editor
 */
async function saveBioFromEditor() {
    var userId = localStorage.getItem('loggedInUserId');
    var textarea = document.getElementById('bioEditorTextarea');
    
    if (!userId) {
        showNotification('Please log in to save your bio', 'error');
        return;
    }
    
    if (!textarea) {
        showNotification('Editor not found', 'error');
        return;
    }
    
    var bioContent = textarea.value;
    
    if (!bioContent.trim()) {
        showNotification('Please enter some content for your bio', 'warning');
        return;
    }
    
    // Save and publish
    var result = await saveArtistBio(userId, bioContent, true);
    
    if (result.success) {
        showNotification('Bio saved and published successfully!', 'success');
        closeBioEditor();
    } else {
        showNotification(result.error || 'Failed to save bio', 'error');
    }
}

/**
 * Save bio as draft from editor
 */
async function saveBioDraftFromEditor() {
    var userId = localStorage.getItem('loggedInUserId');
    var textarea = document.getElementById('bioEditorTextarea');
    
    if (!userId) {
        showNotification('Please log in to save your bio', 'error');
        return;
    }
    
    if (!textarea) {
        showNotification('Editor not found', 'error');
        return;
    }
    
    var bioContent = textarea.value;
    
    // Save as draft
    var result = await saveBioDraft(userId, bioContent);
    
    if (result.success) {
        showNotification('Bio saved as draft', 'success');
    } else {
        showNotification(result.error || 'Failed to save draft', 'error');
    }
}

/**
 * Show notification toast
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info, warning)
 */
function showNotification(message, type) {
    if (type === undefined) type = 'info';
    
    // Try to use existing notification system
    if (typeof window.showMessage === 'function') {
        window.showMessage(message, 'notificationContainer');
        return;
    }

    // Fallback to custom toast
    var container = document.getElementById('notificationContainer');
    if (!container) {
        console.log('[' + type.toUpperCase() + '] ' + message);
        return;
    }

    var toast = document.createElement('div');
    toast.className = 'notification-toast ' + type;
    toast.innerHTML = '<span class="notification-message">' + message + '</span>' +
        '<span class="notification-close" onclick="this.parentElement.remove()">&times;</span>';

    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(function() { toast.classList.add('show'); }, 10);
    
    // Auto remove
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 300);
    }, 5000);
}

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================

/**
 * Wait for Firebase to be ready
 */
function waitForFirebase(callback, maxAttempts = 50) {
    var attempts = 0;
    var checkInterval = setInterval(function() {
        attempts++;
        if (window.db && window.doc && window.getDoc && window.setDoc) {
            clearInterval(checkInterval);
            callback();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('Firebase not loaded after ' + maxAttempts + ' attempts');
        }
    }, 100);
}

/**
 * Initialize bio manager when DOM is ready
 */
function initBioManager() {
    // Wait for Firebase to be ready first
    waitForFirebase(function() {
        // Check if user is logged in
        var userId = localStorage.getItem('loggedInUserId');
        
        if (userId) {
            // Load and display current bio
            updateArtistBioDisplay(userId);
        }

        // Set up character count for textarea
        var textarea = document.getElementById('bioEditorTextarea');
        if (textarea) {
            textarea.addEventListener('input', function() {
                var charCount = document.getElementById('bioCharCount');
                if (charCount) {
                    charCount.textContent = this.value.length + '/' + MAX_BIO_LENGTH;
                    
                    // Visual warning when approaching limit
                    if (this.value.length > MAX_BIO_LENGTH * 0.9) {
                        charCount.classList.add('warning');
                    } else {
                        charCount.classList.remove('warning');
                    }
                }
            });
        }

        // Close modals on outside click
        document.addEventListener('click', function(e) {
            // Bio Editor Modal
            var bioModal = document.getElementById('bioEditorModal');
            if (bioModal && e.target === bioModal) {
                closeBioEditor();
            }

            // Version History Modal
            var versionModal = document.getElementById('versionHistoryModal');
            if (versionModal && e.target === versionModal) {
                closeVersionHistory();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Escape to close modals
            if (e.key === 'Escape') {
                closeBioEditor();
                closeVersionHistory();
            }

            // Ctrl+Enter to save
            if (e.ctrlKey && e.key === 'Enter') {
                var textarea = document.getElementById('bioEditorTextarea');
                var bioModal = document.getElementById('bioEditorModal');
                if (textarea && bioModal && bioModal.style.display === 'flex') {
                    saveBioFromEditor();
                }
            }
        });

        console.log('Bio Manager initialized');
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBioManager);
} else {
    initBioManager();
}

// ============================================
// EXPORT FUNCTIONS TO WINDOW
// ============================================

window.getArtistBio = getArtistBio;
window.saveArtistBio = saveArtistBio;
window.saveBioDraft = saveBioDraft;
window.publishBio = publishBio;
window.getBioVersionHistory = getBioVersionHistory;
window.restoreBioVersion = restoreBioVersion;
window.enterPreviewMode = enterPreviewMode;
window.exitPreviewMode = exitPreviewMode;
window.openBioEditor = openBioEditor;
window.closeBioEditor = closeBioEditor;
window.openVersionHistory = openVersionHistory;
window.closeVersionHistory = closeVersionHistory;
window.viewVersionDetails = viewVersionDetails;
window.updateArtistBioDisplay = updateArtistBioDisplay;
window.formatBioContent = formatBioContent;
window.formatDate = formatDate;
window.showNotification = showNotification;
window.saveBioFromEditor = saveBioFromEditor;
window.saveBioDraftFromEditor = saveBioDraftFromEditor;
window.previewBio = previewBio;
