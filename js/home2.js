let menuVisible = false;
let themeSwitch = localStorage.getItem('homeTheme');
let bb = document.getElementById('themes');
bb.value = themeSwitch;
var fullAucBox = document.getElementById('fullAucBox');
var fullAuc = document.getElementById('fullAucImg');
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
        
        // Validation
        if (!file) {
            alert('Please select an image file to upload.');
            return;
        }
        
        if (!title) {
            alert('Please enter a title for your artwork.');
            return;
        }
        
        // Get the authenticated user from Firebase
        const user = auth.currentUser;
        
        if (!user) {
            alert('You must be logged in to upload artwork.');
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
                alert('Only artists can upload artwork. Please contact admin to upgrade your account.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }
            
            // Upload image to Supabase Storage
            const uploadResult = await uploadArtworkImage(file, userId);
            
            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }
            
            // Save artwork to Firestore
            const saveResult = await saveArtworkToFirestore(userId, {
                title: title,
                description: description,
                imageUrl: uploadResult.url,
                imagePath: uploadResult.path,
                isPublic: true
            });
            
            if (saveResult.success) {
                alert('Artwork uploaded successfully!');
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
            alert('An error occurred during upload: ' + error.message);
        } finally {
            // Restore button state
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}
