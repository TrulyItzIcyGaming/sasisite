function parseCSV(str) {
    const lines = str.trim().split('\n');
    // Regex splits by comma but ignores commas inside quotes
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/(^"|"$)/g, ''));
    return lines.slice(1).map(line => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj = {};
        headers.forEach((h, i) => {
            let val = values[i] || "";
            obj[h] = val.trim().replace(/(^"|"$)/g, '').replace(/""/g, '"'); // unescape quotes
        });
        return obj;
    });
}

document.addEventListener('DOMContentLoaded', async () => {

    // --- DATA POPULATION ---
    let dataToLoad = {};

    try {
        // Fetch CMS data
        const response = await fetch('/data/content.json');
        if (response.ok) {
            dataToLoad = await response.json();
        }
    } catch (error) {
        console.error("Failed to load CMS data:", error);
    }

    // Home teaser elements
    const homeLatestReleaseTitleEl = document.getElementById('home-latest-release-title');
    const homeLatestReleaseNoteEl = document.getElementById('home-latest-release-note');
    const homeLatestReleaseArtEl = document.getElementById('home-latest-release-art');

    const homeNextExhibitionDateEl = document.getElementById('home-next-exhibition-date');
    const homeNextExhibitionCityEl = document.getElementById('home-next-exhibition-city');
    const homeNextExhibitionVenueEl = document.getElementById('home-next-exhibition-venue');
    const homeNextExhibitionTicketEl = document.getElementById('home-next-exhibition-ticket');

    const homeVisualsContainer = document.getElementById('home-visuals');

    // --- FETCH LIVE SPOTIFY STATS ---
    try {
        const statsResponse = await fetch('/.netlify/functions/spotify-stats');
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            const followersEl = document.getElementById('stat-followers');
            const listenersEl = document.getElementById('stat-listeners');

            if (followersEl) followersEl.textContent = stats.followers.toLocaleString();
            if (listenersEl) listenersEl.textContent = stats.listeners.toLocaleString();

            // Render Latest Release teaser from Spotify releases
            if (homeLatestReleaseTitleEl && homeLatestReleaseNoteEl && homeLatestReleaseArtEl) {
                const releases = Array.isArray(stats.releases) ? stats.releases : [];
                if (releases.length > 0) {
                    // newest first by release_date
                    const newest = releases
                        .filter(r => r && r.release_date)
                        .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))[0] || releases[0];

                    homeLatestReleaseTitleEl.textContent = newest.title || 'Latest Release';
                    // if Spotify doesn't provide a note, fall back to a type + year line
                    const year = newest.release_date ? newest.release_date.split('-')[0] : '';
                    const typeLabel = newest.type ? newest.type.toUpperCase() : '';
                    homeLatestReleaseNoteEl.textContent = year || typeLabel ? `${typeLabel}${typeLabel && year ? ' • ' : ''}${year}` : 'New music is here.';
                    if (newest.image) {
                        homeLatestReleaseArtEl.style.background = `url('${newest.image}') center/cover`;
                    }
                }
            }

            // RENDER DISCOGRAPHY RELEASES DIRECTLY FROM SPOTIFY API
            const musicContainer = document.getElementById('dynamic-music');
            if (musicContainer && stats.releases && stats.releases.length > 0) {
                musicContainer.innerHTML = ''; // clear out CMS
                stats.releases.forEach((album, i) => {
                    const card = document.createElement('div');
                    card.className = 'album-card exhibit-item reveal active';
                    card.style.transitionDelay = `${i * 0.1}s`;
                    card.innerHTML = `
                        <div class="album-art" style="background: url('${album.image}') center/cover"></div>
                        <div class="album-info" style="display:flex; flex-direction:column; justify-content:center;">
                            <h3 style="margin-bottom:0.5rem; color:var(--text);">${album.title}</h3>
                            <p class="handwritten" style="color:var(--silver); font-size:1.1rem; margin-bottom:1rem;">${album.type.toUpperCase()} • ${album.release_date.split('-')[0]}</p>
                            <a href="${album.url}" target="_blank" style="color:var(--accent); text-decoration:none; font-family:var(--font-heading); text-transform:uppercase; letter-spacing:2px; font-size:0.9rem;">Listen -></a>
                        </div>
                    `;
                    musicContainer.appendChild(card);
                });
            }

        } else {
            // IF IT FAILS, SHOW THE ERROR IN THE UI
            const errorData = await statsResponse.json();
            console.error("Spotify API Error Data:", errorData);
            const followersEl = document.getElementById('stat-followers');
            if (followersEl) {
                followersEl.textContent = "ERR";
                followersEl.style.fontSize = "1rem";
                followersEl.innerText = errorData.error || "Unknown Error";
            }
        }
    } catch (error) {
        console.error("Failed to load Spotify stats:", error);
    }

    // Render from CMS JSON for tours + gallery + home teasers
    if (dataToLoad) {
        const tourContainer = document.getElementById('dynamic-tour');
        const galleryContainer = document.getElementById('dynamic-gallery');
        const currentTrack = document.getElementById('current-track-name');

        if (currentTrack && dataToLoad.player) currentTrack.textContent = dataToLoad.player.trackName;

        // Render Tours (full page)
        if (tourContainer && dataToLoad.tours) {
            tourContainer.innerHTML = '';
            dataToLoad.tours.forEach((tour, i) => {
                const li = document.createElement('li');
                li.className = 'tour-date reveal';
                li.style.transitionDelay = `${i * 0.1}s`;
                li.innerHTML = `
                    <span class="date">${tour.date}</span>
                    <span class="city">${tour.city}</span>
                    <span class="venue">${tour.venue}</span>
                    <button class="tix-btn">${tour.ticketStatus}</button>
                `;
                tourContainer.appendChild(li);
            });
        }

        // Home: Next Exhibition teaser (use first upcoming)
        if (
            homeNextExhibitionDateEl &&
            homeNextExhibitionCityEl &&
            homeNextExhibitionVenueEl &&
            homeNextExhibitionTicketEl &&
            Array.isArray(dataToLoad.tours) &&
            dataToLoad.tours.length > 0
        ) {
            // If dates are in "MON DD" format only (no year), preserve order from CMS.
            const next = dataToLoad.tours[0];
            homeNextExhibitionDateEl.textContent = next.date || '—';
            homeNextExhibitionCityEl.textContent = next.city || '—';
            homeNextExhibitionVenueEl.textContent = next.venue || '—';
            homeNextExhibitionTicketEl.textContent = next.ticketStatus || '—';
        }

        // Render Gallery (full page)
        if (galleryContainer && dataToLoad.gallery) {
            galleryContainer.innerHTML = '';
            dataToLoad.gallery.forEach((img, i) => {
                const item = document.createElement('div');
                item.className = 'masonry-item reveal';
                item.style.transitionDelay = `${(i % 3) * 0.1}s`;
                item.style.height = img.height;
                item.style.background = `url('${img.url}') center/cover`;
                galleryContainer.appendChild(item);
            });
        }

        // Home: Visuals teaser
        if (homeVisualsContainer && Array.isArray(dataToLoad.gallery) && dataToLoad.gallery.length > 0) {
            homeVisualsContainer.innerHTML = '';
            const teaserImages = dataToLoad.gallery.slice(0, 4);
            teaserImages.forEach((img, i) => {
                const item = document.createElement('div');
                item.className = 'masonry-item reveal';
                item.style.transitionDelay = `${(i % 3) * 0.1}s`;
                item.style.height = img.height;
                item.style.background = `url('${img.url}') center/cover`;
                homeVisualsContainer.appendChild(item);
            });
        }
    }

    // --- INTERACTION LOGIC ---
    
    // Custom Cursor follower
    const cursorGlow = document.querySelector('.cursor-glow');

    
    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    // Handle interactive elements to make the cursor glow expand
    const interactives = document.querySelectorAll('a, button, .album-card, .scrapbook-item');
    interactives.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorGlow.style.width = '400px';
            cursorGlow.style.height = '400px';
            cursorGlow.style.background = 'radial-gradient(circle, rgba(143, 59, 59, 0.2) 0%, rgba(10, 10, 10, 0) 70%)'; // changes to soft-red
        });
        el.addEventListener('mouseleave', () => {
            cursorGlow.style.width = '300px';
            cursorGlow.style.height = '300px';
            cursorGlow.style.background = 'radial-gradient(circle, rgba(94, 129, 172, 0.15) 0%, rgba(10, 10, 10, 0) 70%)';
        });
    });

    // Floating elements slight parallax
    const floatingElements = document.querySelectorAll('.floating-element');
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        floatingElements.forEach(el => {
            const speed = 20;
            const moveX = (x - 0.5) * speed;
            const moveY = (y - 0.5) * speed;
            
            // Preserve the original rotation if it had any inline styles
            const currentTransform = el.style.transform;
            let rotateMatch = currentTransform.match(/rotate\((.*?)\)/);
            let rotate = rotateMatch ? rotateMatch[0] : '';
            
            el.style.transform = `translate(${moveX}px, ${moveY}px) ${rotate}`;
        });
    });

    // --- PARTICLE SYSTEM ---
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        let particles = [];

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
        });

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.color = Math.random() > 0.5 ? '#00d2ff' : '#cccccc';
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > width) this.x = 0;
                else if (this.x < 0) this.x = width;
                if (this.y > height) this.y = 0;
                else if (this.y < 0) this.y = height;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            let numParticles = (width * height) / 15000; // density
            for (let i = 0; i < numParticles; i++) {
                particles.push(new Particle());
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }
            requestAnimationFrame(animateParticles);
        }

        initParticles();
        animateParticles();
    }

    // Scroll Reveal functionality (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal');
    const exposeOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const exposeOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, exposeOptions);

    revealElements.forEach(el => {
        exposeOnScroll.observe(el);
    });
});

// Simple SPA router logic
function navTo(pageId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show new view
    const activeView = document.getElementById(pageId);
    if(activeView) {
        activeView.classList.add('active');
        window.scrollTo(0, 0);

        // Retrigger intersection observer reveals when changing tabs
        const reveals = activeView.querySelectorAll('.reveal');
        reveals.forEach(r => r.classList.remove('active'));
        
        setTimeout(() => {
            reveals.forEach(r => r.classList.add('active'));
        }, 100);
    }
}
