let menuVisible = false;
let themeSwitch = localStorage.getItem('homeTheme');
let bb = document.getElementById('themes');
bb.value = themeSwitch;
var fullAucBox = document.getElementById('fullAucBox');
var fullAuc = document.getElementById('fullAucImg');

// Current auction data for detail view
let currentAuctionData = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load auctions when page loads
    loadAuctions();
    
    // Setup auction checkbox toggle
    const addToAuctionCheckbox = document.getElementById('addToAuction');
    const auctionDetails = document.getElementById('auctionDetails');
    if (addToAuctionCheckbox && auctionDetails) {
        addToAuctionCheckbox.addEventListener('change', function() {
            auctionDetails.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // Setup artwork submission form
    setupArtworkSubmission();
});

function showMenu() {
    menuVisible = !menuVisible;
    if (menuVisible) {
        document.getElementById("sideBar").style.display = "none";
        img.src = "assets/icons/menuoff.png";
    } else {
        document.getElementById("sideBar").style.display = "flex";
        img.src = "assets/icons/menuon.png";
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
            // Reload auctions when navigating to auction page
            loadAuctions();
            break;
        case 4:
            document.getElementById('artistf').style.display = 'block';
            document.getElementById('nav4').classList.add("active");
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
// AUCTION FUNCTIONS
// ============================================

/**
 * Load auctions from database and render them
 */
async function loadAuctions() {
    const aucCont = document.querySelector('#auctionf .aucCont');
    if (!aucCont) return;
    
    try {
        // Call the getAuctions function from supabase.js
        const result = await getAuctions();
        
        if (result.success && result.auctions && result.auctions.length > 0) {
            // Clear existing content
            aucCont.innerHTML = '';
            
            // Render each auction
            result.auctions.forEach(auction => {
                const artwork = auction.artworks;
                const artist = artwork.users;
                
                // Get artist name
                let artistName = 'Unknown Artist';
                if (artist) {
                    artistName = `${artist.firstName || ''} ${artist.lastName || ''}`.trim() || artist.email || 'Unknown Artist';
                }
                
                // Format price
                const price = auction.currentBid ? `$${auction.currentBid.toLocaleString()}` : '$0';
                
                // Create auction card HTML
                const card = document.createElement('div');
                card.className = 'aucart';
                card.dataset.auctionId = auction.id;
                card.innerHTML = `
                    <img src="${artwork.imageUrl || 'css/image/placeholder.jpg'}" alt="${artwork.title || 'Artwork'}">
                    <div class="aucTitle">
                        <p class="auc-artwork-title">${artwork.title || 'Untitled'}</p>
                        <p class="auc-artist-name">by ${artistName}</p>
                        <p class="auc-price">${price}</p>
                    </div>
                `;
                
                // Add click handler for auction detail
                card.addEventListener('click', function() {
                    showAuctionDetail(auction);
                });
                
                aucCont.appendChild(card);
            });
        } else {
            // No auctions found - show empty state
            aucCont.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;"><p>No auctions available yet.</p><p>Be the first to put your artwork on auction!</p></div>';
        }
    } catch (error) {
        console.error('Error loading auctions:', error);
        aucCont.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;"><p>Error loading auctions.</p></div>';
    }
}

/**
 * Show auction detail view
 */
function showAuctionDetail(auction) {
    currentAuctionData = auction;
    
    const artwork = auction.artworks;
    const artist = artwork.users;
    
    // Update the fullAucBox elements
    const artImg = document.getElementById('artImg');
    const artTitle = document.getElementById('artTitle');
    const artDesc = document.getElementById('artDesc');
    const artDate = document.getElementById('artDate');
    
    if (artImg) artImg.src = artwork.imageUrl || 'css/image/placeholder.jpg';
    if (artTitle) artTitle.textContent = artwork.title || 'Untitled';
    if (artDesc) artDesc.textContent = artwork.description || 'No description available.';
    if (artDate) {
        const createdDate = new Date(auction.createdAt);
        const artistName = artist ? (artist.firstName + ' ' + artist.lastName) : 'Unknown';
        artDate.textContent = `Posted by ${artistName} on ${createdDate.toLocaleDateString()}`;
    }
    
    // Update current bid display
    const bidDisplay = fullAucBox.querySelector('.biddingarea p p');
    if (bidDisplay) {
        bidDisplay.textContent = `$${auction.currentBid ? auction.currentBid.toLocaleString() : '0'}`;
    }
    
    // Setup bid button
    const bidButton = fullAucBox.querySelector('.biddingarea button');
    
    if (bidButton) {
        bidButton.onclick = function() {
            placeBidOnAuction(auction.id);
        };
    }
    
    // Show the detail view
    fullAucBox.style.display = "flex";
    navIndex(99);
}

/**
 * Place a bid on the current auction
 */
async function placeBidOnAuction(auctionId) {
    const bidInput = document.getElementById('offerbid');
    const bidAmount = parseFloat(bidInput.value);
    
    if (!bidAmount || bidAmount <= 0) {
        alert('Please enter a valid bid amount.');
        return;
    }
    
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        alert('Please log in to place a bid.');
        return;
    }
    
    try {
        // Get user email for the bid
        const userProfile = await getUserProfile(userId);
        const userEmail = userProfile.success ? userProfile.data.email : 'Anonymous';
        
        const result = await placeBid(auctionId, bidAmount, userId, userEmail);
        
        if (result.success) {
            alert('Bid placed successfully!');
            bidInput.value = '';
            
            // Refresh the auction detail view
            const updatedAuction = await getAuctionById(auctionId);
            if (updatedAuction.success) {
                showAuctionDetail(updatedAuction.auction);
            }
            
            // Also refresh the auction list
            loadAuctions();
        } else {
            alert('Bid failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error placing bid:', error);
        alert('Error placing bid. Please try again.');
    }
}

// ============================================
// ARTWORK SUBMISSION WITH AUCTION
// ============================================

/**
 * Setup artwork submission with auction option
 */
function setupArtworkSubmission() {
    const form = document.getElementById('art-contest-submit');
    const fileInput = document.getElementById('submContest');
    const preview = document.getElementById('uploadPreview');
    
    if (!form || !fileInput) return;
    
    // Handle file selection preview
    fileInput.addEventListener("change", function() {
        const file = this.files[0];
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = "block";
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const userId = localStorage.getItem('loggedInUserId');
        if (!userId) {
            alert('Please log in to submit artwork.');
            return;
        }
        
        // Get form values
        const title = document.getElementById('contestSubmitTitle')?.value;
        const description = document.getElementById('contestSubmitDesc')?.value;
        const addToAuction = document.getElementById('addToAuction')?.checked;
        const startingPrice = parseFloat(document.getElementById('auctionStartingPrice')?.value);
        const duration = parseInt(document.getElementById('auctionDuration')?.value) || 7;
        
        // Validate
        if (!title || title.trim() === '') {
            alert('Please enter a title for your artwork.');
            return;
        }
        
        if (!fileInput.files[0]) {
            alert('Please select an image to upload.');
            return;
        }
        
        // If auction is selected, validate auction details
        if (addToAuction) {
            if (!startingPrice || startingPrice <= 0) {
                alert('Please enter a valid starting price for the auction.');
                return;
            }
        }
        
        // Check if user is an artist
        const isArtistUser = await checkIsArtist(userId);
        if (!isArtistUser) {
            alert('Only artists can upload artwork. Please contact admin to upgrade your account.');
            return;
        }
        
        // Upload artwork
        const file = fileInput.files[0];
        const submitBtn = document.getElementById('submitArtworkBtn');
        const originalBtnText = submitBtn.textContent;
        
        try {
            submitBtn.textContent = 'Uploading...';
            submitBtn.disabled = true;
            
            const uploadResult = await uploadAndSaveArtwork(file, userId, {
                title: title.trim(),
                description: description ? description.trim() : '',
                tags: [],
                isPublic: true
            });
            
            if (!uploadResult.success) {
                alert('Upload failed: ' + uploadResult.error);
                return;
            }
            
            // If auction option is selected, create auction
            if (addToAuction && uploadResult.success) {
                const auctionResult = await createAuction(userId, uploadResult.id, startingPrice, duration);
                
                if (auctionResult.success) {
                    alert('Artwork uploaded and auction created successfully!');
                } else {
                    alert('Artwork uploaded, but failed to create auction: ' + auctionResult.error);
                }
            } else {
                alert('Artwork uploaded successfully!');
            }
            
            // Reset form
            form.reset();
            preview.style.display = 'none';
            preview.src = '';
            document.getElementById('auctionDetails').style.display = 'none';
            
            // Navigate to auction page to see the new listing
            navIndex(3);
            
        } catch (error) {
            console.error('Error submitting artwork:', error);
            alert('Error submitting artwork. Please try again.');
        } finally {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// ============================================
// ORIGINAL EVENT HANDLERS (kept for compatibility)
// ============================================

document.querySelectorAll('.aucart').forEach(function(card) {
    card.addEventListener('click', function() {
        const img = this.querySelector('img');
        fullAucBox.style.display = "flex";
        fullAuc.src = img.src;
        navIndex(99);
    });
});

function logOut() {
    localStorage.removeItem('loggedInUserId');
    window.location.href = "index.html";
}

if(!localStorage.getItem('loggedInUserId')) {
    window.location.href = "index.html";
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
