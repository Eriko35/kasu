let menuVisible = false;
let darkMode = true;

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
function showLoginForm(type) {
    document.getElementById('loginType').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    const typeTitle = type === 'guest' ? 'ENTER AS GUEST' : 'ARTIST LOG IN';
    document.getElementById('formTitle').textContent = typeTitle;
}

function backToTypeSelection() {
    document.getElementById('loginType').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
}
const scroller = document.querySelector('.horizontal-scroll');
const floor = document.querySelector('.floor');
const step = 200; // increase this for faster arrow scroll
const stopscroll = document.querySelector('.fullArtBox');
// Existing wheel scroll → horizontal movement

// Always attach listeners
scroller.addEventListener('wheel', (e) => {
    if (getComputedStyle(stopscroll).display === "none") {
        e.preventDefault();
        scroller.scrollLeft += e.deltaY;
        syncFloor();
    } else {
        // Allow normal vertical scroll (do nothing)
    }
}, { passive: false });

scroller.addEventListener('scroll', () => {
    if (getComputedStyle(stopscroll).display === "none") {
        syncFloor();
    }
});

window.addEventListener('keydown', (e) => {
    if (getComputedStyle(stopscroll).display === "none") {
        const max = scroller.scrollWidth - scroller.clientWidth;

        if (e.key === "ArrowRight") {
            scroller.scrollLeft = Math.min(scroller.scrollLeft + step, max);
            syncFloor();
        } 
        else if (e.key === "ArrowLeft") {
            scroller.scrollLeft = Math.max(scroller.scrollLeft - step, 0);
            syncFloor();
        }
    } 
    else {
        // Do nothing if stopscroll is visible
    }
});

function syncFloor() {
    floor.style.backgroundPositionX = `${-scroller.scrollLeft}px`;
}
    

function toggleDarkMode() {
    if (darkMode) {
        document.body.classList.add('light-mode');
        document.getElementById('darkToggle').src = "css/icons/light.webp";
        document.getElementById('icon-nav').src = "css/icons/icon-dark.webp";
    } else { document.body.classList.remove('light-mode');
        document.getElementById('darkToggle').src = "css/icons/dark.webp";
        document.getElementById('icon-nav').src = "css/icons/icon-light.webp";
     }
    darkMode = !darkMode;
}
function removeTheme() {
    document.body.classList.remove('light-theme');
    document.body.classList.remove('pink-theme');
    document.body.classList.remove('ocean-theme');
}
function changeTheme() {
    const th = document.getElementById('themes').value;
    switch(th) {
        case 'light':
            removeTheme();
            document.body.classList.add('light-theme');
            break;
        case 'pink':
            removeTheme();
            document.body.classList.add('pink-theme');
            break;
        case 'ocean':
            removeTheme();
            document.body.classList.add('ocean-theme');
            break;
        default:
            removeTheme();
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
            document.getElementById('fullAucBox').style.display = 'block';
            document.getElementById('nav4').classList.add("active");
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
    });
});
function closeFullArt() {
    document.querySelector('.fullArtBox').style.display = 'none';
}
function openFullArt() {
    document.querySelector('.fullArtBox').style.display = 'flex';
}
if(!localStorage.getItem('loggedInUserId')) {
    window.location.href = "index.html";
}