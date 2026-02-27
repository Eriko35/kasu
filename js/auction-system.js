// ============================================
// KAMUSEO DIGITAL AUCTION PLATFORM
// Main Auction System Module
// ============================================

import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    increment 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// Initialize services
const db = getFirestore();
const auth = getAuth();

// ============================================
// DATABASE COLLECTION REFERENCES
// ============================================
const COLLECTIONS = {
    ARTWORKS: 'artworks',
    AUCTIONS: 'auctions',
    BIDS: 'bids',
    ARTWORK_VERSIONS: 'artwork_versions',
    USERS: 'users',
    MUSEUM_REFERENCES: 'museum_references',
    NOTIFICATIONS: 'notifications'
};

// ============================================
// AUCTION STATUS CONSTANTS
// ============================================
const AUCTION_STATUS = {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    ACTIVE: 'active',
    ENDED: 'ended',
    CANCELLED: 'cancelled',
    SOLD: 'sold'
};

// ============================================
// CURRENT USER TRACKING
// ============================================
let currentUser = null;
let currentUserData = null;

// Initialize auth listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        await loadUserData(user.uid);
    } else {
        currentUserData = null;
    }
});

/**
 * Load user data from Firestore
 * @param {string} userId - User ID
 */
async function loadUserData(userId) {
    try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        if (userDoc.exists()) {
            currentUserData = { id: userDoc.id, ...userDoc.data() };
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// ============================================
// ARTWORK MANAGEMENT
// ============================================

/**
 * Create a new artwork listing
 * @param {Object} artworkData - Artwork data object
 * @returns {Promise<Object>} - Result with artwork ID or error
 */
async function createArtwork(artworkData) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        const artworkRef = doc(collection(db, COLLECTIONS.ARTWORKS));
        const artworkId = artworkRef.id;
        
        const now = serverTimestamp();
        
        const artwork = {
            id: artworkId,
            artistId: currentUser.uid,
            artistName: currentUserData ? `${currentUserData.firstName} ${currentUserData.lastName}` : 'Unknown',
            title: artworkData.title,
            description: artworkData.description,
            medium: artworkData.medium || '',
            dimensions: artworkData.dimensions || '',
            yearCreated: artworkData.yearCreated || null,
            imageUrl: artworkData.imageUrl,
            imagePath: artworkData.imagePath,
            startingBid: parseFloat(artworkData.startingBid) || 0,
            currentBid: parseFloat(artworkData.startingBid) || 0,
            bidIncrement: parseFloat(artworkData.bidIncrement) || 1,
            auctionDuration: parseInt(artworkData.auctionDuration) || 7, // days
            auctionStatus: AUCTION_STATUS.DRAFT,
            createdAt: now,
            updatedAt: now,
            version: 1,
            museumReferences: artworkData.museumReferences || [],
            views: 0,
            favoriteCount: 0
        };

        await setDoc(artworkRef, artwork);

        // Create initial version record
        await createArtworkVersion(artworkId, artwork, 'created');

        return { success: true, artworkId, artwork };
    } catch (error) {
        console.error('Error creating artwork:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing artwork
 * @param {string} artworkId - Artwork ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Result with success or error
 */
async function updateArtwork(artworkId, updates) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        // Get current artwork
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { success: false, error: 'Artwork not found' };
        }

        const artwork = artworkDoc.data();

        // Check authorization - only artist can edit
        if (artwork.artistId !== currentUser.uid) {
            return { success: false, error: 'You can only edit your own artwork' };
        }

        // Check if auction has ended
        if (artwork.auctionStatus === AUCTION_STATUS.ENDED || 
            artwork.auctionStatus === AUCTION_STATUS.SOLD) {
            return { success: false, error: 'Cannot edit artwork after auction has ended' };
        }

        // Create version before updating
        await createArtworkVersion(artworkId, artwork, 'updated');

        // Update fields
        const updateData = {
            ...updates,
            updatedAt: serverTimestamp(),
            version: increment(1)
        };

        await updateDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId), updateData);

        return { success: true, artworkId };
    } catch (error) {
        console.error('Error updating artwork:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Replace artwork image
 * @param {string} artworkId - Artwork ID
 * @param {File} newImageFile - New image file
 * @returns {Promise<Object>} - Result with new image URL or error
 */
async function replaceArtworkImage(artworkId, newImageFile) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        // Get current artwork
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { success: false, error: 'Artwork not found' };
        }

        const artwork = artworkDoc.data();

        // Check authorization
        if (artwork.artistId !== currentUser.uid) {
            return { success: false, error: 'You can only edit your own artwork' };
        }

        // Upload new image
        const uploadResult = await uploadArtworkImage(newImageFile, currentUser.uid, 'auction');
        if (!uploadResult.success) {
            return { success: false, error: uploadResult.error };
        }

        // Delete old image if exists
        if (artwork.imagePath) {
            await deleteArtworkImage(artwork.imagePath);
        }

        // Update artwork with new image
        const updateData = {
            imageUrl: uploadResult.url,
            imagePath: uploadResult.path,
            updatedAt: serverTimestamp(),
            version: increment(1)
        };

        await updateDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId), updateData);

        // Create version record
        await createArtworkVersion(artworkId, { ...artwork, ...updateData }, 'image_replaced');

        return { success: true, imageUrl: uploadResult.url };
    } catch (error) {
        console.error('Error replacing image:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete an artwork
 * @param {string} artworkId - Artwork ID
 * @returns {Promise<Object>} - Result with success or error
 */
async function deleteArtwork(artworkId) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { success: false, error: 'Artwork not found' };
        }

        const artwork = artworkDoc.data();

        // Check authorization
        if (artwork.artistId !== currentUser.uid) {
            return { success: false, error: 'You can only delete your own artwork' };
        }

        // Check if auction is active
        if (artwork.auctionStatus === AUCTION_STATUS.ACTIVE) {
            return { success: false, error: 'Cannot delete artwork during active auction' };
        }

        // Delete image
        if (artwork.imagePath) {
            await deleteArtworkImage(artwork.imagePath);
        }

        // Delete all versions
        const versionsQuery = query(
            collection(db, COLLECTIONS.ARTWORK_VERSIONS),
            where('artworkId', '==', artworkId)
        );
        const versionsSnapshot = await getDocs(versionsQuery);
        for (const versionDoc of versionsSnapshot.docs) {
            await deleteDoc(doc(db, COLLECTIONS.ARTWORK_VERSIONS, versionDoc.id));
        }

        // Delete all bids
        const bidsQuery = query(
            collection(db, COLLECTIONS.BIDS),
            where('artworkId', '==', artworkId)
        );
        const bidsSnapshot = await getDocs(bidsQuery);
        for (const bidDoc of bidsSnapshot.docs) {
            await deleteDoc(doc(db, COLLECTIONS.BIDS, bidDoc.id));
        }

        // Delete artwork
        await deleteDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));

        return { success: true };
    } catch (error) {
        console.error('Error deleting artwork:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// VERSION HISTORY
// ============================================

/**
 * Create artwork version record
 * @param {string} artworkId - Artwork ID
 * @param {Object} artworkData - Current artwork data
 * @param {string} changeType - Type of change
 */
async function createArtworkVersion(artworkId, artworkData, changeType) {
    try {
        const versionRef = doc(collection(db, COLLECTIONS.ARTWORK_VERSIONS));
        
        const version = {
            id: versionRef.id,
            artworkId: artworkId,
            version: artworkData.version || 1,
            changeType: changeType,
            changedBy: currentUser ? currentUser.uid : 'system',
            changedAt: serverTimestamp(),
            // Snapshot of artwork data at this version
            snapshot: {
                title: artworkData.title,
                description: artworkData.description,
                imageUrl: artworkData.imageUrl,
                startingBid: artworkData.startingBid,
                auctionDuration: artworkData.auctionDuration,
                museumReferences: artworkData.museumReferences || []
            }
        };

        await setDoc(versionRef, version);
    } catch (error) {
        console.error('Error creating version:', error);
    }
}

/**
 * Get version history for artwork
 * @param {string} artworkId - Artwork ID
 * @returns {Promise<Array>} - Array of version records
 */
async function getArtworkVersionHistory(artworkId) {
    try {
        const versionsQuery = query(
            collection(db, COLLECTIONS.ARTWORK_VERSIONS),
            where('artworkId', '==', artworkId),
            orderBy('changedAt', 'desc')
        );

        const snapshot = await getDocs(versionsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting version history:', error);
        return [];
    }
}

// ============================================
// AUCTION MANAGEMENT
// ============================================

/**
 * Start an auction for artwork
 * @param {string} artworkId - Artwork ID
 * @param {Date} startDate - Optional start date (defaults to now)
 * @returns {Promise<Object>} - Result with success or error
 */
async function startAuction(artworkId, startDate = null) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { error: 'Art success: false,work not found' };
        }

        const artwork = artworkDoc.data();

        // Check authorization
        if (artwork.artistId !== currentUser.uid) {
            return { success: false, error: 'You can only start auctions for your own artwork' };
        }

        const start = startDate ? new Date(startDate) : new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + artwork.auctionDuration);

        const updateData = {
            auctionStatus: AUCTION_STATUS.ACTIVE,
            auctionStartDate: start,
            auctionEndDate: end,
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId), updateData);

        return { 
            success: true, 
            auctionStartDate: start,
            auctionEndDate: end
        };
    } catch (error) {
        console.error('Error starting auction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * End an auction
 * @param {string} artworkId - Artwork ID
 * @returns {Promise<Object>} - Result with success or error
 */
async function endAuction(artworkId) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { success: false, error: 'Artwork not found' };
        }

        const artwork = artworkDoc.data();

        // Check authorization
        if (artwork.artistId !== currentUser.uid) {
            return { success: false, error: 'Only the artist can end the auction' };
        }

        // Get highest bid
        const highestBid = await getHighestBid(artworkId);
        
        const updateData = {
            auctionStatus: highestBid ? AUCTION_STATUS.SOLD : AUCTION_STATUS.ENDED,
            auctionEndDate: serverTimestamp(),
            winningBidId: highestBid ? highestBid.id : null,
            finalPrice: highestBid ? highestBid.amount : artwork.currentBid,
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId), updateData);

        // Notify winner if there's a bid
        if (highestBid) {
            await createNotification(
                highestBid.bidderId,
                'Congratulations!',
                `You won the auction for "${artwork.title}"!`
            );
        }

        return { success: true, artwork: { ...artwork, ...updateData } };
    } catch (error) {
        console.error('Error ending auction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Schedule an auction for future
 * @param {string} artworkId - Artwork ID
 * @param {Date} startDate - Scheduled start date
 * @returns {Promise<Object>} - Result with success or error
 */
async function scheduleAuction(artworkId, startDate) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { success: false, error: 'Artwork not found' };
        }

        const artwork = artworkDoc.data();

        // Check authorization
        if (artwork.artistId !== currentUser.uid) {
            return { success: false, error: 'You can only schedule your own auctions' };
        }

        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + artwork.auctionDuration);

        const updateData = {
            auctionStatus: AUCTION_STATUS.SCHEDULED,
            auctionStartDate: start,
            auctionEndDate: end,
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId), updateData);

        return { success: true };
    } catch (error) {
        console.error('Error scheduling auction:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// BIDDING SYSTEM
// ============================================

/**
 * Place a bid on artwork
 * @param {string} artworkId - Artwork ID
 * @param {number} bidAmount - Bid amount
 * @returns {Promise<Object>} - Result with success or error
 */
async function placeBid(artworkId, bidAmount) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required. Please sign in to place bids.' };
    }

    try {
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { success: false, error: 'Artwork not found' };
        }

        const artwork = artworkDoc.data();

        // Check if auction is active
        if (artwork.auctionStatus !== AUCTION_STATUS.ACTIVE) {
            return { success: false, error: 'Auction is not active' };
        }

        // Check if auction has ended
        if (artwork.auctionEndDate && new Date(artwork.auctionEndDate.toDate()) < new Date()) {
            return { success: false, error: 'Auction has ended' };
        }

        // Check if bidder is not the artist
        if (artwork.artistId === currentUser.uid) {
            return { success: false, error: 'You cannot bid on your own artwork' };
        }

        // Validate bid amount
        const minBid = artwork.currentBid + artwork.bidIncrement;
        if (bidAmount < minBid) {
            return { success: false, error: `Minimum bid is $${minBid.toFixed(2)}` };
        }

        // Create bid record
        const bidRef = doc(collection(db, COLLECTIONS.BIDS));
        const bid = {
            id: bidRef.id,
            artworkId: artworkId,
            bidderId: currentUser.uid,
            bidderName: currentUserData ? `${currentUserData.firstName} ${currentUserData.lastName}` : 'Anonymous',
            amount: bidAmount,
            timestamp: serverTimestamp(),
            isWinning: true
        };

        await setDoc(bidRef, bid);

        // Update previous winning bid
        const previousBidsQuery = query(
            collection(db, COLLECTIONS.BIDS),
            where('artworkId', '==', artworkId),
            where('isWinning', '==', true)
        );
        const previousBids = await getDocs(previousBidsQuery);
        for (const prevBid of previousBids.docs) {
            if (prevBid.id !== bidRef.id) {
                await updateDoc(doc(db, COLLECTIONS.BIDS, prevBid.id), { isWinning: false });
            }
        }

        // Update artwork current bid
        await updateDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId), {
            currentBid: bidAmount,
            updatedAt: serverTimestamp()
        });

        // Notify artist
        await createNotification(
            artwork.artistId,
            'New Bid!',
            `${currentUserData?.firstName || 'Someone'} placed a $${bidAmount} bid on "${artwork.title}"`
        );

        return { success: true, bid };
    } catch (error) {
        console.error('Error placing bid:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get highest bid for artwork
 * @param {string} artworkId - Artwork ID
 * @returns {Promise<Object>} - Highest bid object
 */
async function getHighestBid(artworkId) {
    try {
        const bidsQuery = query(
            collection(db, COLLECTIONS.BIDS),
            where('artworkId', '==', artworkId),
            orderBy('amount', 'desc')
        );

        const snapshot = await getDocs(bidsQuery);
        if (snapshot.empty) {
            return null;
        }

        const highestBid = snapshot.docs[0].data();
        return { id: snapshot.docs[0].id, ...highestBid };
    } catch (error) {
        console.error('Error getting highest bid:', error);
        return null;
    }
}

/**
 * Get all bids for artwork
 * @param {string} artworkId - Artwork ID
 * @returns {Promise<Array>} - Array of bid objects
 */
async function getArtworkBids(artworkId) {
    try {
        const bidsQuery = query(
            collection(db, COLLECTIONS.BIDS),
            where('artworkId', '==', artworkId),
            orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(bidsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting bids:', error);
        return [];
    }
}

/**
 * Subscribe to real-time bid updates
 * @param {string} artworkId - Artwork ID
 * @param {Function} callback - Callback function for updates
 * @returns {Function} - Unsubscribe function
 */
function subscribeToBids(artworkId, callback) {
    const bidsQuery = query(
        collection(db, COLLECTIONS.BIDS),
        where('artworkId', '==', artworkId),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(bidsQuery, (snapshot) => {
        const bids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(bids);
    });
}

// ============================================
// MUSEUM REFERENCES
// ============================================

/**
 * Add museum reference to artwork
 * @param {string} artworkId - Artwork ID
 * @param {Object} museumRef - Museum reference object
 * @returns {Promise<Object>} - Result with success or error
 */
async function addMuseumReference(artworkId, museumRef) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { success: false, error: 'Artwork not found' };
        }

        const artwork = artworkDoc.data();

        // Check authorization
        if (artwork.artistId !== currentUser.uid) {
            return { success: false, error: 'You can only add references to your own artwork' };
        }

        const references = artwork.museumReferences || [];
        references.push({
            id: Date.now().toString(),
            museumId: museumRef.museumId,
            museumName: museumRef.museumName,
            artworkId: museumRef.artworkId,
            artworkTitle: museumRef.artworkTitle,
            artworkImage: museumRef.artworkImage,
            inspiration: museumRef.inspiration || '',
            addedAt: new Date().toISOString()
        });

        await updateDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId), {
            museumReferences: references,
            updatedAt: serverTimestamp()
        });

        return { success: true, references };
    } catch (error) {
        console.error('Error adding museum reference:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remove museum reference from artwork
 * @param {string} artworkId - Artwork ID
 * @param {string} referenceId - Reference ID
 * @returns {Promise<Object>} - Result with success or error
 */
async function removeMuseumReference(artworkId, referenceId) {
    if (!currentUser) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return { success: false, error: 'Artwork not found' };
        }

        const artwork = artworkDoc.data();

        // Check authorization
        if (artwork.artistId !== currentUser.uid) {
            return { success: false, error: 'You can only remove references from your own artwork' };
        }

        const references = (artwork.museumReferences || []).filter(r => r.id !== referenceId);

        await updateDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId), {
            museumReferences: references,
            updatedAt: serverTimestamp()
        });

        return { success: true, references };
    } catch (error) {
        console.error('Error removing museum reference:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Create notification
 * @param {string} userId - User ID to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
async function createNotification(userId, title, message) {
    try {
        const notifRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
        await setDoc(notifRef, {
            userId: userId,
            title: title,
            message: message,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of notifications
 */
async function getUserNotifications(userId) {
    try {
        const notifQuery = query(
            collection(db, COLLECTIONS.NOTIFICATIONS),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(notifQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting notifications:', error);
        return [];
    }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get all active auctions
 * @returns {Promise<Array>} - Array of active artworks
 */
async function getActiveAuctions() {
    try {
        const auctionsQuery = query(
            collection(db, COLLECTIONS.ARTWORKS),
            where('auctionStatus', '==', AUCTION_STATUS.ACTIVE),
            orderBy('auctionEndDate', 'asc')
        );

        const snapshot = await getDocs(auctionsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting active auctions:', error);
        return [];
    }
}

/**
 * Get artist's artworks
 * @param {string} artistId - Artist ID
 * @returns {Promise<Array>} - Array of artworks
 */
async function getArtistArtworks(artistId) {
    try {
        const artworksQuery = query(
            collection(db, COLLECTIONS.ARTWORKS),
            where('artistId', '==', artistId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(artworksQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting artist artworks:', error);
        return [];
    }
}

/**
 * Get single artwork
 * @param {string} artworkId - Artwork ID
 * @returns {Promise<Object>} - Artwork object
 */
async function getArtwork(artworkId) {
    try {
        const artworkDoc = await getDoc(doc(db, COLLECTIONS.ARTWORKS, artworkId));
        if (!artworkDoc.exists()) {
            return null;
        }
        return { id: artworkDoc.id, ...artworkDoc.data() };
    } catch (error) {
        console.error('Error getting artwork:', error);
        return null;
    }
}

/**
 * Subscribe to artwork updates
 * @param {string} artworkId - Artwork ID
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
function subscribeToArtwork(artworkId, callback) {
    return onSnapshot(doc(db, COLLECTIONS.ARTWORKS, artworkId), (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() });
        }
    });
}

/**
 * Get featured/ending soon auctions
 * @param {number} limit - Maximum number to return
 * @returns {Promise<Array>} - Array of artworks
 */
async function getEndingSoonAuctions(limit = 10) {
    try {
        const now = new Date();
        const auctionsQuery = query(
            collection(db, COLLECTIONS.ARTWORKS),
            where('auctionStatus', '==', AUCTION_STATUS.ACTIVE),
            orderBy('auctionEndDate', 'asc')
        );

        const snapshot = await getDocs(auctionsQuery);
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(a => a.auctionEndDate && new Date(a.auctionEndDate.toDate()) > now)
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting ending soon auctions:', error);
        return [];
    }
}

/**
 * Get artwork by ID (exported for other modules)
 */
export {
    createArtwork,
    updateArtwork,
    replaceArtworkImage,
    deleteArtwork,
    getArtworkVersionHistory,
    startAuction,
    endAuction,
    scheduleAuction,
    placeBid,
    getHighestBid,
    getArtworkBids,
    subscribeToBids,
    addMuseumReference,
    removeMuseumReference,
    getUserNotifications,
    getActiveAuctions,
    getArtistArtworks,
    getArtwork,
    subscribeToArtwork,
    getEndingSoonAuctions,
    COLLECTIONS,
    AUCTION_STATUS,
    currentUser,
    currentUserData,
    auth,
    db
};
