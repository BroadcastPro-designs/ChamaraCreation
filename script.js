/**
 * Chamara Creation - Portfolio Website
 * Lenis Smooth Scroll + GSAP ScrollTrigger Animations + Liquid Glass UI
 * Advanced Google Sheets Visual CMS Engine
 * 
 * Features:
 * - Lenis premium smooth scrolling (60fps)
 * - GSAP ScrollTrigger synced with Lenis for buttery animations
 * - Scroll-linked animations and transitions
 * - Advanced Google Sheets CMS with full layout control
 * - Global text & style overrides via Element_ID targeting
 * - Dynamic portfolio & gear content with multi-image support
 * - YouTube embed auto-transformation
 * - Portfolio carousel with filter support
 * - Navigation and UI interactions
 * - Contact form with Web3Forms
 */

// ==================== POCKETBASE CMS CONFIGURATION ====================
// Uses the same origin since the page is served by PocketBase's pb_public
// PocketBase runs on port 8090. When served directly via PocketBase, window.location.origin
// already points there. When served via a different server (e.g. Live Server on port 5500),
// we need to find PocketBase on its actual port.
const POCKETBASE_URL = window.location.port === '8090'
    ? window.location.origin
    : `http://${window.location.hostname}:8090`;

// ==================== POCKETBASE COLLECTION NAMES ====================
const PB_COLLECTIONS = {
    PORTFOLIO: 'portfolio'
};

// ==================== GLOBAL ITEM STORE ====================
// Stores all PocketBase items keyed by ID for detail modal lookups
let pbItems = {};

// ==================== AUTO-REFRESH CONFIG ====================
const CMS_REFRESH_INTERVAL = 30000; // 30 seconds

// ==================== YOUTUBE URL PARSER ====================
function parseYouTubeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    const trimmedUrl = url.trim();
    
    // Match all standard YouTube URL formats in one regex:
    // - youtube.com/watch?v=VIDEO_ID
    // - youtu.be/VIDEO_ID
    // - youtube.com/embed/VIDEO_ID
    const match = trimmedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    
    if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    return null;
}

// ==================== CMS HELPER FUNCTIONS ====================

/**
 * Parse a comma-separated Media_URLs string into an array of trimmed, non-empty URLs.
 */
function parseMediaUrls(urlString) {
    if (!urlString || typeof urlString !== 'string') return [];
    return urlString
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
}

/**
 * Apply Width, Height, and Layout_Order as inline CSS styles on a DOM element.
 */
function applyLayoutStyles(el, width, height, layoutOrder) {
    if (!el) return;
    if (width && width.trim()) el.style.width = width.trim();
    if (height && height.trim()) el.style.height = height.trim();
    if (layoutOrder && String(layoutOrder).trim()) el.style.order = String(layoutOrder).trim();
}

/**
 * Build a PocketBase file URL for media/image fields.
 */
function buildPocketBaseFileUrl(collectionId, recordId, filename) {
    if (!collectionId || !recordId || !filename) return null;
    return `${POCKETBASE_URL}/api/files/${collectionId}/${recordId}/${filename}`;
}

// ==================== LENIS SMOOTH SCROLL ====================
let lenis;

function initLenis() {
    lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
    });

    // Sync Lenis scroll with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Add Lenis' requestAnimationFrame ticker to GSAP's ticker
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    // Disable lag smoothing in GSAP for consistent 60fps
    gsap.ticker.lagSmoothing(0);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis smooth scroll
    initLenis();

    // Initialize all synchronous modules first
    initNavigation();
    initScrollProgress();
    initHeroAnimations();
    initServiceCards();
    initContactForm();
    initSmoothScroll();
    initScrollFloatImproved();

    // Initialize the TextPressure effect on the hero titles
    // Uses Roboto Flex variable font for mouse-reactive glyph distortion
    initTextPressure({
        containerId: 'tp-container-primary',
        text: 'Chamara Creation',
        fontFamily: '"Roboto Flex", sans-serif',
        enableWidth: true,
        enableWeight: true,
        enableItalic: true,
        enableAlpha: false,
        enableFlex: true,
        enableStroke: false,
        enableScale: false,
        textColor: '#FFFFFF',
        strokeColor: '#E50914',
        minFontSize: 40,
        smoothing: 15
    });

    initTextPressure({
        containerId: 'tp-container-secondary',
        text: 'Professional Studio',
        fontFamily: '"Roboto Flex", sans-serif',
        enableWidth: true,
        enableWeight: true,
        enableItalic: true,
        enableAlpha: false,
        enableFlex: true,
        enableStroke: false,
        enableScale: false,
        textColor: '#FFFFFF',
        strokeColor: '#E50914',
        minFontSize: 24,
        smoothing: 15
    });

    // Fetch and render ALL dynamic content from PocketBase CMS
    // This MUST complete before any animations are initialized,
    // because GSAP/ScrollTrigger need real DOM nodes to calculate positions
    const cmsSource = await loadPocketbaseCMS();

    // Start auto-refresh polling ONLY if connected to live PocketBase:
    // - cmsSource === 'live' means PocketBase was reachable → poll every 30s for live updates
    // - cmsSource === 'static' means we loaded from static JSON → no polling needed
    // - cmsSource === null means both failed → no polling needed
    if (cmsSource === 'live') {
        setInterval(() => {
            loadPocketbaseCMS();
        }, CMS_REFRESH_INTERVAL);
    }

    // Initialize liquid glass AFTER dynamic content is in the DOM
    // so the mouse-tracking listeners attach to portfolio & gear cards
    initLiquidGlass();
    initGlassSurface();

    // Initialize carousel and gear showcase AFTER content is loaded
    initPortfolioCarousel();
    initGearShowcase();

    // Initialize scroll animations AFTER dynamic content is in the DOM
    initScrollAnimations();

    // Initialize typing animations on enriched text elements
    // Uses IntersectionObserver to start typing when scrolled into view
    initAllTextTypes();

    // Initialize count-up animation on hero stat numbers
    // Animates from 0 → target value with ease-out cubic, triggered on scroll
    initCountUp();

});

// ==================== POCKETBASE CMS ENGINE ====================
async function loadPocketbaseCMS() {
    const portfolioContainer = document.getElementById('portfolio-carousel');
    const gearContainer = document.querySelector('.gear-grid');

    try {
        // Fetch ALL items from the portfolio collection only
        // The 'type' field determines where each item goes:
        //   type = "Project" → Portfolio section
        //   type = "Setup"   → Gear section
        const res = await fetch(
            `${POCKETBASE_URL}/api/collections/${PB_COLLECTIONS.PORTFOLIO}/records?sort=layout_order,-created&perPage=100`
        );

        // Clear existing placeholder items before injecting CMS content
        if (portfolioContainer) {
            portfolioContainer.innerHTML = '';
        }
        if (gearContainer) {
            gearContainer.innerHTML = '';
        }

        let projectCount = 0;
        let gearCount = 0;

        if (res.ok) {
            const data = await res.json();
            const items = data.items || [];

            items.forEach(item => {
                const itemType = (item.type || '').trim();

                // Build media_urls string: prefer file upload, fall back to media_urls text field
                let mediaUrlsStr = item.media_urls || '';
                
                // Handle single or multiple uploaded files (maxSelect > 1 returns array)
                // Append in correct order so gallery order matches upload order
                const mediaFiles = Array.isArray(item.media) ? item.media : (item.media ? [item.media] : []);
                mediaFiles.forEach(filename => {
                    if (filename) {
                        const fileUrl = buildPocketBaseFileUrl(item.collectionId, item.id, filename);
                        if (fileUrl) {
                            mediaUrlsStr = mediaUrlsStr 
                                ? `${mediaUrlsStr},${fileUrl}` 
                                : fileUrl;
                        }
                    }
                });

                        // Store item in global store for modal lookups
                pbItems[item.id] = item;

                // Route to correct section based on type field
                if (itemType === 'Project') {
                    const card = buildProjectCard(
                        item.id,
                        item.title || '',
                        item.category || item.type || '',
                        mediaUrlsStr,
                        item.video_url || '',
                        item.description || '',
                        item.width || '',
                        item.height || '',
                        item.layout_order || ''
                    );
                    if (portfolioContainer && card) {
                        portfolioContainer.appendChild(card);
                        projectCount++;
                    }
                } else if (itemType === 'Setup') {
                    const card = buildGearCard(
                        item.id,
                        item.title || '',
                        item.category || item.type || '',
                        mediaUrlsStr,
                        item.description || '',
                        item.product_url || item.video_url || '',
                        item.width || '',
                        item.height || '',
                        item.layout_order || ''
                    );
                    if (gearContainer && card) {
                        gearContainer.appendChild(card);
                        gearCount++;
                    }
                }
                // Items with other types (Videography, Photography, etc.) are silently skipped
            });
        }

        // Show fallback messages if no content was loaded
        if (projectCount === 0 && portfolioContainer) {
            portfolioContainer.innerHTML = `
                <div class="portfolio-empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                        <circle cx="9" cy="9" r="2"></circle>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                    </svg>
                    <p style="margin-top: 16px; font-size: 1rem;">No projects available yet. Check back soon!</p>
                </div>
            `;
        }

        if (gearCount === 0 && gearContainer) {
            gearContainer.innerHTML = `
                <div class="gear-empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <p style="margin-top: 16px; font-size: 1rem;">No gear information available yet.</p>
                </div>
            `;
        }

        // Add click handlers to open detail modal on portfolio & gear items
        document.querySelectorAll('.portfolio-item, .gear-item').forEach(el => {
            el.addEventListener('click', function(e) {
                const itemId = this.dataset.itemId;
                if (itemId && pbItems[itemId]) {
                    openDetailModal(pbItems[itemId]);
                }
            });
        });

        console.log(`✅ PocketBase CMS loaded: ${projectCount} projects, ${gearCount} gear items`);
        return 'live'; // Live PocketBase mode — enable auto-refresh polling

    } catch (error) {
        console.warn('⚠️ PocketBase unavailable, trying static data fallback...', error);

        // ── Try loading from static data file (for GitHub Pages / static hosting) ──
        try {
            const staticRes = await fetch('data/portfolio.json');

            if (staticRes.ok) {
                const data = await staticRes.json();
                const items = data.items || [];

                // Clear containers
                if (portfolioContainer) portfolioContainer.innerHTML = '';
                if (gearContainer) gearContainer.innerHTML = '';

                let projectCount = 0;
                let gearCount = 0;

                items.forEach(item => {
                    const itemType = (item.type || '').trim();

                    // Static data has pre-resolved media_urls (local relative paths),
                    // and media is empty — so just use media_urls directly
                    const mediaUrlsStr = item.media_urls || '';

                    // Store item in global store for modal lookups
                    pbItems[item.id] = item;

                    // Route to correct section based on type field
                    if (itemType === 'Project') {
                        const card = buildProjectCard(
                            item.id,
                            item.title || '',
                            item.category || item.type || '',
                            mediaUrlsStr,
                            item.video_url || '',
                            item.description || '',
                            item.width || '',
                            item.height || '',
                            item.layout_order || ''
                        );
                        if (portfolioContainer && card) {
                            portfolioContainer.appendChild(card);
                            projectCount++;
                        }
                    } else if (itemType === 'Setup') {
                        const card = buildGearCard(
                            item.id,
                            item.title || '',
                            item.category || item.type || '',
                            mediaUrlsStr,
                            item.description || '',
                            item.product_url || item.video_url || '',
                            item.width || '',
                            item.height || '',
                            item.layout_order || ''
                        );
                        if (gearContainer && card) {
                            gearContainer.appendChild(card);
                            gearCount++;
                        }
                    }
                });

                // Show fallback messages if no content was loaded
                if (projectCount === 0 && portfolioContainer) {
                    portfolioContainer.innerHTML = `
                        <div class="portfolio-empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                                <circle cx="9" cy="9" r="2"></circle>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                            </svg>
                            <p style="margin-top: 16px; font-size: 1rem;">No projects available yet. Check back soon!</p>
                        </div>
                    `;
                }
                if (gearCount === 0 && gearContainer) {
                    gearContainer.innerHTML = `
                        <div class="gear-empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <p style="margin-top: 16px; font-size: 1rem;">No gear information available yet.</p>
                        </div>
                    `;
                }

                // Add click handlers for detail modal
                document.querySelectorAll('.portfolio-item, .gear-item').forEach(el => {
                    el.addEventListener('click', function(e) {
                        const itemId = this.dataset.itemId;
                        if (itemId && pbItems[itemId]) {
                            openDetailModal(pbItems[itemId]);
                        }
                    });
                });

                console.log(`✅ Static data loaded: ${projectCount} projects, ${gearCount} gear items (PocketBase offline)`);
                return 'static'; // Static mode — no auto-refresh needed
            }
        } catch (staticError) {
            console.error('❌ Static data fallback also failed:', staticError);
        }

        // If we're here, both PocketBase and static data failed — show error state
        console.error('❌ All data sources failed to load content');
        const errorHTML = `
            <div class="content-error-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style="margin-top: 16px; font-size: 1rem;">Unable to load content. Please try refreshing the page.</p>
                <button onclick="location.reload()" style="margin-top: 12px; padding: 10px 24px; background: var(--accent-color, #E50914); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">
                    Retry
                </button>
            </div>
        `;

        if (portfolioContainer && portfolioContainer.children.length === 0) {
            portfolioContainer.innerHTML = errorHTML;
        }
        if (gearContainer && gearContainer.children.length === 0) {
            gearContainer.innerHTML = errorHTML;
        }
        return null; // Both sources failed — no polling
    }
}

// ==================== BUILD PROJECT CARD ====================
function buildProjectCard(itemId, title, type, mediaUrlsString, videoUrl, description, width, height, layoutOrder) {
    const typeLower = (type || '').toLowerCase().trim();
    const embedUrl = parseYouTubeUrl(videoUrl);
    const mediaUrls = parseMediaUrls(mediaUrlsString);
    
    // Create the outer portfolio item container
    const portfolioItem = document.createElement('div');
    portfolioItem.className = 'portfolio-item';
    portfolioItem.setAttribute('data-category', typeLower);
    if (itemId) portfolioItem.setAttribute('data-item-id', itemId);

    // Apply layout property injection from spreadsheet
    applyLayoutStyles(portfolioItem, width, height, layoutOrder);

    // Create the thumbnail container with glass-card class
    const thumbnail = document.createElement('div');
    thumbnail.className = 'portfolio-thumbnail glass-card';

    // ── MEDIA LOGIC: Images (prefer as thumbnails) → Video files → YouTube → Placeholder ──
    const imageUrls = mediaUrls.filter(url => getMediaType(url) === 'image');
    const videoUrls = mediaUrls.filter(url => getMediaType(url) === 'video');

    if (imageUrls.length > 0) {
        // Images found — use as slideshow thumbnail (preferred)
        const slideshowContainer = document.createElement('div');
        slideshowContainer.className = 'portfolio-multi-image';
        slideshowContainer.style.cssText = 'position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 8px;';

        imageUrls.forEach((url, index) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = `${title || 'Project'} - Image ${index + 1}`;
            img.loading = index === 0 ? 'eager' : 'lazy';
            img.style.cssText = [
                'width: 100%',
                'height: 100%',
                'object-fit: cover',
                'border-radius: 8px',
                `position: ${index === 0 ? 'relative' : 'absolute'}`,
                'top: 0',
                'left: 0',
                index === 0 ? '' : 'opacity: 0',
                'transition: opacity 0.6s ease'
            ].filter(Boolean).join('; ');

            img.onerror = function() {
                this.style.display = 'none';
            };

            slideshowContainer.appendChild(img);
        });

        // Auto-rotate images every 10 seconds if multiple images exist
        if (imageUrls.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            let currentImageIndex = 0;
            const intervalId = setInterval(() => {
                const images = slideshowContainer.querySelectorAll('img');
                if (images.length <= 1) { clearInterval(intervalId); return; }
                images[currentImageIndex].style.opacity = '0';
                currentImageIndex = (currentImageIndex + 1) % images.length;
                images[currentImageIndex].style.opacity = '1';
            }, 10000);
            slideshowContainer.dataset.slideshowInterval = intervalId;
        }

        thumbnail.appendChild(slideshowContainer);

    } else if (videoUrls.length > 0) {
        // No images, but video files exist — show first video with play icon
        const videoWrapper = document.createElement('div');
        videoWrapper.style.cssText = 'position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #000;';
        
        const video = document.createElement('video');
        video.src = videoUrls[0];
        video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        videoWrapper.appendChild(video);
        
        // Play icon overlay
        const playIcon = document.createElement('div');
        playIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));">
                <circle cx="12" cy="12" r="10" fill="rgba(229,9,20,0.8)"/>
                <polygon points="10 8 16 12 10 16 10 8" fill="white"/>
            </svg>
        `;
        playIcon.style.cssText = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;';
        videoWrapper.appendChild(playIcon);
        
        thumbnail.appendChild(videoWrapper);

    } else if (embedUrl) {
        // YouTube embed as thumbnail
        const iframeWrapper = document.createElement('div');
        iframeWrapper.className = 'portfolio-video-wrapper';
        iframeWrapper.style.cssText = 'position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;';
        
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.title = title || 'YouTube video';
        iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('allowfullscreen', '');
        iframe.loading = 'lazy';
        
        iframeWrapper.appendChild(iframe);
        thumbnail.appendChild(iframeWrapper);

    } else {
        // No media at all — show placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'portfolio-placeholder';
        placeholder.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
        `;
        thumbnail.appendChild(placeholder);
    }

    // Create the overlay content
    const overlay = document.createElement('div');
    overlay.className = 'portfolio-overlay';
    overlay.innerHTML = `
        <span class="portfolio-category">${escapeHtml(type)}</span>
        <h4 class="portfolio-title">${escapeHtml(title)}</h4>
        <p class="portfolio-meta">${escapeHtml(description)}</p>
    `;

    // Create the liquid glass shine effect
    const shine = document.createElement('div');
    shine.className = 'liquid-glass-shine';
    shine.setAttribute('aria-hidden', 'true');

    // Assemble the card
    thumbnail.appendChild(overlay);
    thumbnail.appendChild(shine);
    portfolioItem.appendChild(thumbnail);

    return portfolioItem;
}

// ==================== BUILD GEAR CARD ====================
function buildGearCard(itemId, title, type, mediaUrlsString, description, productUrl, width, height, layoutOrder) {
    const typeLower = (type || '').toLowerCase().trim();
    const mediaUrls = parseMediaUrls(mediaUrlsString);
    
    // Create the outer gear item container
    const gearItem = document.createElement('div');
    gearItem.className = 'gear-item glass-card';
    gearItem.setAttribute('data-gear', typeLower);
    if (itemId) gearItem.setAttribute('data-item-id', itemId);

    // Apply layout property injection from spreadsheet
    applyLayoutStyles(gearItem, width, height, layoutOrder);

    // Create the icon/image container
    const iconContainer = document.createElement('div');
    iconContainer.className = 'gear-item-icon';

    // Use first Media_URL as icon thumbnail, or fall back to default gear SVG
    if (mediaUrls.length > 0) {
        const img = document.createElement('img');
        img.src = mediaUrls[0];
        img.alt = title || 'Gear icon';
        img.loading = 'lazy';
        img.style.cssText = 'width: 40px; height: 40px; object-fit: contain; border-radius: 8px;';
        img.onerror = function() {
            this.style.display = 'none';
            this.parentNode.innerHTML = getDefaultGearIcon();
        };
        iconContainer.appendChild(img);
    } else {
        iconContainer.innerHTML = getDefaultGearIcon();
    }

    // Create the info container
    const infoContainer = document.createElement('div');
    infoContainer.className = 'gear-item-info';
    infoContainer.innerHTML = `
        <h4 class="gear-item-title">${escapeHtml(title)}</h4>
        <p class="gear-item-desc">${escapeHtml(description)}</p>
    `;

    // Create the tooltip with optional product link from video_url column
    const tooltip = document.createElement('div');
    tooltip.className = 'gear-item-tooltip';
    let tooltipContent = `<p>${escapeHtml(description)}</p>`;
    if (productUrl && productUrl.trim()) {
        tooltipContent += `<a href="${escapeHtml(productUrl.trim())}" target="_blank" rel="noopener noreferrer" class="gear-product-link" style="display: inline-block; margin-top: 8px; color: var(--accent-color, #E50914); font-size: 13px; text-decoration: none; font-weight: 500;">View Product →</a>`;
    }
    tooltip.innerHTML = tooltipContent;

    // Create the liquid glass shine effect
    const shine = document.createElement('div');
    shine.className = 'liquid-glass-shine';
    shine.setAttribute('aria-hidden', 'true');

    // Assemble the card
    gearItem.appendChild(iconContainer);
    gearItem.appendChild(infoContainer);
    gearItem.appendChild(tooltip);
    gearItem.appendChild(shine);

    return gearItem;
}

// ==================== DEFAULT GEAR ICON ====================
function getDefaultGearIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;
}

// ==================== HTML ESCAPE UTILITY ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== MODAL SMOOTH SCROLL (Lenis) ====================
let modalLenis = null;

/**
 * Initialize a scoped Lenis instance for smooth scrolling inside the modal.
 */
function initModalSmoothScroll() {
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;

    // Destroy previous instance if any
    if (modalLenis) {
        modalLenis.destroy();
        modalLenis = null;
    }

    modalLenis = new Lenis({
        wrapper: modalContent,
        content: document.getElementById('modal-body'),
        duration: 0.8,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.6,
        touchMultiplier: 1.2,
        infinite: false,
    });

    // Animate with requestAnimationFrame
    function raf(time) {
        if (!modalLenis) return;
        modalLenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
}

/**
 * Destroy the modal Lenis instance.
 */
function destroyModalSmoothScroll() {
    if (modalLenis) {
        modalLenis.destroy();
        modalLenis = null;
    }
}

// ==================== MODAL GALLERY NAVIGATION ====================
let modalGalleryIndex = 0;
let modalGalleryUrls = [];

/**
 * Navigate to a specific gallery item (image, video, or YouTube) with smooth crossfade.
 * Supports mixed media — images fade, videos/YouTube swap instantly.
 * Prevents race conditions from rapid clicks by killing previous tweens.
 */
function navigateGallery(newIndex) {
    const items = document.querySelectorAll('.modal-gallery-media, .modal-gallery-img');
    const counter = document.getElementById('modal-gallery-counter');
    if (items.length === 0) return;

    // Clamp index
    newIndex = Math.max(0, Math.min(newIndex, items.length - 1));
    if (newIndex === modalGalleryIndex) return;

    // Kill any in-progress tweens
    gsap.killTweensOf(items);

    const oldIndex = modalGalleryIndex;
    const oldItem = items[oldIndex];
    const newItem = items[newIndex];

    // Determine if we're transitioning between images (fade) or to/from video/YouTube (swap)
    const oldIsImage = oldItem && oldItem.classList.contains('modal-gallery-img');
    const newIsImage = newItem && newItem.classList.contains('modal-gallery-img');

    if (oldIsImage && newIsImage) {
        // Smooth crossfade between two images
        gsap.set(oldItem, { opacity: 0, scale: 1.05 });
        oldItem.style.display = 'none';
    } else if (oldIsImage) {
        // Image → video/YouTube: just swap
        oldItem.style.display = 'none';
    } else {
        // Video/YouTube → anything: just hide
        if (oldItem) oldItem.style.display = 'none';
    }

    // Show the new item
    modalGalleryIndex = newIndex;
    newItem.style.display = 'block';

    if (newIsImage) {
        // Fade in new image
        gsap.fromTo(newItem,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }
        );
    }

    // Pause any previously playing video
    items.forEach(item => {
        const video = item.querySelector('video');
        if (video && !video.paused) video.pause();
    });

    // Update counter
    if (counter) {
        counter.textContent = `${modalGalleryIndex + 1} / ${items.length}`;
    }

    // Update dot active state
    document.querySelectorAll('.modal-gallery-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === modalGalleryIndex);
    });

    // Update arrow visibility
    updateGalleryArrows();
}

function updateGalleryArrows() {
    const prevBtn = document.getElementById('modal-gallery-prev');
    const nextBtn = document.getElementById('modal-gallery-next');
    const items = document.querySelectorAll('.modal-gallery-media, .modal-gallery-img');
    if (!prevBtn || !nextBtn) return;

    prevBtn.style.opacity = modalGalleryIndex <= 0 ? '0.3' : '1';
    prevBtn.style.pointerEvents = modalGalleryIndex <= 0 ? 'none' : 'auto';
    nextBtn.style.opacity = modalGalleryIndex >= items.length - 1 ? '0.3' : '1';
    nextBtn.style.pointerEvents = modalGalleryIndex >= items.length - 1 ? 'none' : 'auto';
}

// ==================== LIGHTBOX (Image Enlargement) ====================

/**
 * Opens a fullscreen lightbox overlay to view an enlarged image.
 * Only shows images (not videos/YouTube), with prev/next navigation.
 */
function openLightbox(index) {
    // Find all image-only items from the media list
    const images = document.querySelectorAll('.modal-gallery-img');
    if (images.length === 0) return;

    // Find the image at or nearest to the given index
    let targetIdx = -1;
    images.forEach((img, i) => {
        const mediaIdx = parseInt(img.dataset.mediaIndex);
        if (mediaIdx === index) targetIdx = i;
    });
    if (targetIdx < 0) {
        // Fall back to first image
        targetIdx = 0;
    }

    // Build image URLs array from gallery images
    const imageUrls = [];
    images.forEach(img => imageUrls.push(img.src));

    // Get or create lightbox overlay
    let lbOverlay = document.getElementById('lightbox-overlay');
    if (!lbOverlay) {
        lbOverlay = document.createElement('div');
        lbOverlay.id = 'lightbox-overlay';
        lbOverlay.className = 'lightbox-overlay';
        lbOverlay.innerHTML = `
            <button class="lightbox-close" id="lightbox-close" aria-label="Close lightbox">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
            </button>
            <button class="lightbox-arrow lightbox-arrow--prev" id="lightbox-prev" aria-label="Previous image">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                </svg>
            </button>
            <div class="lightbox-image-wrapper">
                <img id="lightbox-img" src="" alt="Enlarged view" />
            </div>
            <button class="lightbox-arrow lightbox-arrow--next" id="lightbox-next" aria-label="Next image">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                </svg>
            </button>
            <div class="lightbox-counter" id="lightbox-counter"></div>
        `;
        document.body.appendChild(lbOverlay);

        // Event listeners
        document.getElementById('lightbox-close').onclick = closeLightbox;
        document.getElementById('lightbox-prev').onclick = () => navigateLightbox(-1);
        document.getElementById('lightbox-next').onclick = () => navigateLightbox(1);
        lbOverlay.addEventListener('click', (e) => {
            if (e.target === lbOverlay) closeLightbox();
        });
    }

    // Store lightbox state
    lbOverlay.dataset.currentIndex = targetIdx;
    lbOverlay.dataset.totalImages = images.length;
    lbOverlay.imageUrls = imageUrls;

    // Show first image
    showLightboxImage(targetIdx);

    // Show overlay with animation
    lbOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();

    // Keyboard navigation
    document.addEventListener('keydown', handleLightboxKeydown);
}

function closeLightbox() {
    const lbOverlay = document.getElementById('lightbox-overlay');
    if (!lbOverlay) return;
    lbOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    document.removeEventListener('keydown', handleLightboxKeydown);
}

function handleLightboxKeydown(e) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') navigateLightbox(-1);
    else if (e.key === 'ArrowRight') navigateLightbox(1);
}

function navigateLightbox(direction) {
    const lbOverlay = document.getElementById('lightbox-overlay');
    if (!lbOverlay || !lbOverlay.classList.contains('active')) return;
    const current = parseInt(lbOverlay.dataset.currentIndex);
    const total = parseInt(lbOverlay.dataset.totalImages);
    let next = current + direction;
    if (next < 0) next = 0;
    if (next >= total) next = total - 1;
    if (next === current) return;
    lbOverlay.dataset.currentIndex = next;
    showLightboxImage(next);
}

function showLightboxImage(index) {
    const lbOverlay = document.getElementById('lightbox-overlay');
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    if (!lbOverlay || !img) return;

    const urls = lbOverlay.imageUrls || [];
    const total = parseInt(lbOverlay.dataset.totalImages) || 1;

    img.src = urls[index] || '';
    img.alt = 'Image ' + (index + 1);

    if (counter) counter.textContent = `${index + 1} / ${total}`;
    if (prevBtn) {
        prevBtn.style.opacity = index <= 0 ? '0.2' : '1';
        prevBtn.style.pointerEvents = index <= 0 ? 'none' : 'auto';
    }
    if (nextBtn) {
        nextBtn.style.opacity = index >= total - 1 ? '0.2' : '1';
        nextBtn.style.pointerEvents = index >= total - 1 ? 'none' : 'auto';
    }
}

/**
 * Detect whether a URL points to an image or a video file based on extension.
 */
function getMediaType(url) {
    if (!url) return 'image';
    const cleanUrl = url.split('?')[0].split('#')[0];
    const ext = cleanUrl.substring(cleanUrl.lastIndexOf('.')).toLowerCase();
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogv', '.3gp'];
    return videoExts.includes(ext) ? 'video' : 'image';
}

/**
 * Build an array of media URLs from a PocketBase item, supporting:
 * - Single uploaded file (string)
 * - Multiple uploaded files (array, when maxSelect > 1)
 * - External URLs from media_urls text field
 */
function buildMediaUrls(item) {
    let urls = [];

    // Handle uploaded files (single string or array of strings)
    if (item.media && item.collectionId && item.id) {
        const mediaFiles = Array.isArray(item.media) ? item.media : [item.media];
        mediaFiles.forEach(filename => {
            if (filename) {
                const fileUrl = buildPocketBaseFileUrl(item.collectionId, item.id, filename);
                if (fileUrl) urls.push(fileUrl);
            }
        });
    }

    // Add external URLs from media_urls
    if (item.media_urls) {
        const externalUrls = parseMediaUrls(item.media_urls);
        urls = urls.concat(externalUrls);
    }

    // Deduplicate
    return [...new Set(urls)];
}

/**
 * Build a unified array of media objects for the modal gallery.
 * Each object: { type: 'image'|'video'|'youtube', url: string, poster?: string }
 * Combines uploaded files (images + videos) with YouTube embed from video_url.
 */
function buildModalMediaList(item) {
    const list = [];
    const mediaUrls = buildMediaUrls(item);

    // Add uploaded files — classify each as image or video
    mediaUrls.forEach(url => {
        const type = getMediaType(url);
        list.push({ type, url });
    });

    // Add YouTube embed if video_url contains a YouTube link
    const videoUrl = item.video_url || '';
    const embedUrl = parseYouTubeUrl(videoUrl);
    if (embedUrl) {
        list.push({ type: 'youtube', url: embedUrl });
    }

    return list;
}

/**
 * Find the URL of the first image in a media list, or null.
 */
function findFirstImageUrl(mediaUrls) {
    if (!mediaUrls || mediaUrls.length === 0) return null;
    for (const url of mediaUrls) {
        if (getMediaType(url) === 'image') return url;
    }
    return null;
}

// ==================== DETAIL MODAL ====================

/**
 * Opens a full-detail popup modal for a PocketBase item.
 * Displays an interactive image gallery, title, description, badges, and metadata.
 */
function openDetailModal(item) {
    const overlay = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    if (!overlay || !body) return;

    // Get item details
    const title = item.title || 'Untitled';
    const type = item.type || '';
    const description = item.description || '';
    const videoUrl = item.video_url || '';
    const embedUrl = parseYouTubeUrl(videoUrl);

    // Build unified media list (images + uploaded videos + YouTube embeds)
    const mediaList = buildModalMediaList(item);
    modalGalleryIndex = 0;
    modalGalleryUrls = mediaList.map(m => m.url);

    // ── Build unified mixed-media gallery ──
    let mediaHTML = '';
    // Find the first image URL for video posters
    const firstPosterUrl = findFirstImageUrl(mediaList.filter(m => m.type === 'image').map(m => m.url));
    
    if (mediaList.length > 0) {
        const itemsHTML = mediaList.map((media, i) => {
            const display = i === 0 ? 'block' : 'none';
            if (media.type === 'youtube') {
                return `
                    <div class="modal-gallery-media modal-gallery-youtube"
                         style="display: ${display}" data-media-index="${i}">
                        <iframe src="${escapeHtml(media.url)}"
                                title="${escapeHtml(title)}"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen loading="lazy"></iframe>
                    </div>`;
            } else if (media.type === 'video') {
                return `
                    <div class="modal-gallery-media modal-gallery-video"
                         style="display: ${display}" data-media-index="${i}">
                        <video src="${escapeHtml(media.url)}"
                               controls playsinline preload="metadata"
                               poster="${firstPosterUrl ? escapeHtml(firstPosterUrl) : ''}">
                        </video>
                    </div>`;
            } else {
                // Image — clickable to open lightbox
                return `
                    <img class="modal-gallery-img${i === 0 ? ' active' : ''}"
                         src="${escapeHtml(media.url)}"
                         alt="${escapeHtml(title)} - ${i + 1}"
                         loading="${i === 0 ? 'eager' : 'lazy'}"
                         style="display: ${display}"
                         data-media-index="${i}"
                         onclick="openLightbox(${i})"
                    />`;
            }
        }).join('');

        const showArrows = mediaList.length > 1;

        mediaHTML = `
            <div class="modal-gallery" data-total="${mediaList.length}">
                <div class="modal-gallery-track">
                    ${itemsHTML}
                </div>
                ${showArrows ? `
                <button class="modal-gallery-arrow modal-gallery-arrow--prev" id="modal-gallery-prev"
                        aria-label="Previous" onclick="navigateGallery(${modalGalleryIndex} - 1)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </button>
                <button class="modal-gallery-arrow modal-gallery-arrow--next" id="modal-gallery-next"
                        aria-label="Next" onclick="navigateGallery(${modalGalleryIndex} + 1)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                    </svg>
                </button>
                <div class="modal-gallery-counter" id="modal-gallery-counter">1 / ${mediaList.length}</div>
                ` : ''}
                <div class="modal-gallery-dots">
                    ${mediaList.map((_, i) => `<button class="modal-gallery-dot${i === 0 ? ' active' : ''}"
                        onclick="navigateGallery(${i})" aria-label="Item ${i + 1}"></button>`).join('')}
                </div>
            </div>
        `;
    } else {
        // No media — show placeholder
        mediaHTML = `<div class="modal-media-placeholder">${getDefaultMediaPlaceholder()}</div>`;
    }

    // ── Build extra metadata tags ──
    let extraHTML = '';
    const tags = [];
    if (item.category) tags.push(item.category);
    if (item.product_url) tags.push('🔗 Product Link');

    tags.forEach(tag => {
        extraHTML += `
            <span class="modal-extra-tag">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                </svg>
                ${escapeHtml(tag)}
            </span>
        `;
    });

    // External link for gear items
    const linkUrl = item.product_url || item.video_url || '';
    if (linkUrl && !embedUrl) {
        extraHTML += `
            <a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="modal-extra-tag" style="text-decoration: none;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                View External Link
            </a>
        `;
    }

    // ── Assemble and inject into modal body ──
    body.innerHTML = `
        <div class="modal-gallery-wrapper">
            ${mediaHTML}
        </div>
        <div class="modal-details">
            <div class="modal-details-header">
                ${type ? `<span class="modal-badge" id="modal-badge">${escapeHtml(type)}</span>` : ''}
            </div>
            <h2 class="modal-title" id="modal-title">${escapeHtml(title)}</h2>
            ${description ? `<div class="modal-description" id="modal-description">${escapeHtml(description)}</div>` : ''}
            ${extraHTML ? `<div class="modal-extra" id="modal-extra">${extraHTML}</div>` : ''}
        </div>
    `;

    // Set up image error handlers immediately (before images start loading)
    // to catch errors that happen during the 600ms GSAP entrance animation
    document.querySelectorAll('.modal-gallery-img').forEach(img => {
        img.onerror = function() {
            const placeholder = document.createElement('div');
            placeholder.className = 'modal-media-placeholder';
            placeholder.innerHTML = getDefaultMediaPlaceholder();
            this.parentNode.replaceChild(placeholder, this);
        };
        // Catch images already in error state
        if (img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
            img.onerror.call(img);
        }
    });

    // Show the modal with GSAP entrance animation
    const modalContent = document.getElementById('modal-content');
    if (modalContent) {
        gsap.set(modalContent, {
            '--tilt-scale': '0.88',
            '--tilt-translate-y': '30px',
            opacity: 0
        });
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();

    // GSAP spring entrance animation
    if (modalContent) {
        gsap.to(modalContent, {
            '--tilt-scale': 1,
            '--tilt-translate-y': '0px',
            opacity: 1,
            duration: 0.6,
            ease: 'back.out(1.7)',
            onComplete: () => {
                // Initialize tilt and smooth scroll after entrance
                initModalTilt();
                initModalSmoothScroll();

                // Set up gallery arrow click handlers
                const prevBtn = document.getElementById('modal-gallery-prev');
                const nextBtn = document.getElementById('modal-gallery-next');
                if (prevBtn && nextBtn) {
                    prevBtn.onclick = () => navigateGallery(modalGalleryIndex - 1);
                    nextBtn.onclick = () => navigateGallery(modalGalleryIndex + 1);
                }
                // Reattach dot onclick handlers
                document.querySelectorAll('.modal-gallery-dot').forEach((dot, i) => {
                    dot.onclick = () => navigateGallery(i);
                });
                updateGalleryArrows();
            }
        });
    }

    // Focus trap
    setTimeout(() => {
        const closeBtn = document.getElementById('modal-close');
        if (closeBtn) closeBtn.focus();
    }, 200);
}

/**
 * Closes the detail modal popup.
 */
function closeDetailModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    // Animate out
    const modalContent = document.getElementById('modal-content');
    if (modalContent) {
        gsap.to(modalContent, {
            '--tilt-scale': '0.88',
            '--tilt-translate-y': '30px',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                if (lenis) lenis.start();
                destroyModalSmoothScroll();
                if (modalContent) {
                    modalContent.style.setProperty('--tilt-x', '0deg');
                    modalContent.style.setProperty('--tilt-y', '0deg');
                    modalContent.style.opacity = '';
                }
            }
        });
    } else {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        if (lenis) lenis.start();
    }
}

// Keyboard gallery navigation
function initModalKeyboardNav() {
    document.addEventListener('keydown', (e) => {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay || !overlay.classList.contains('active')) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigateGallery(modalGalleryIndex - 1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            navigateGallery(modalGalleryIndex + 1);
        }
    });
}

// Call once on load
initModalKeyboardNav();

/**
 * Returns a default SVG placeholder for modal media.
 */
function getDefaultMediaPlaceholder() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <circle cx="9" cy="9" r="2"></circle>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
        </svg>
    `;
}

// ==================== MODAL TILTED CARD 3D EFFECT ====================
/**
 * Converts React Bits' TiltedCard component to vanilla JS.
 * Applies smooth 3D tilt rotation to the modal content based on mouse position,
 * with spring-like interpolation using requestAnimationFrame.
 */
let modalTiltAnimationId = null;
let tiltTargetX = 0;
let tiltTargetY = 0;
let tiltCurrentX = 0;
let tiltCurrentY = 0;

function initModalTilt() {
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;

    const rotateAmplitude = 6; // max degrees of tilt (±6°)
    const springDamping = 0.1; // interpolation factor (0-1, lower = more springy)

    function animateTilt() {
        // Spring-like interpolation toward target
        tiltCurrentX += (tiltTargetX - tiltCurrentX) * springDamping;
        tiltCurrentY += (tiltTargetY - tiltCurrentY) * springDamping;

        modalContent.style.setProperty('--tilt-x', `${tiltCurrentX}deg`);
        modalContent.style.setProperty('--tilt-y', `${tiltCurrentY}deg`);

        // Continue animating until settled
        if (Math.abs(tiltCurrentX - tiltTargetX) > 0.01 ||
            Math.abs(tiltCurrentY - tiltTargetY) > 0.01) {
            modalTiltAnimationId = requestAnimationFrame(animateTilt);
        } else {
            modalTiltAnimationId = null;
        }
    }

    function onMouseMove(e) {
        const rect = modalContent.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = (e.clientX - centerX) / (rect.width / 2);
        const offsetY = (e.clientY - centerY) / (rect.height / 2);

        tiltTargetY = offsetX * rotateAmplitude;
        tiltTargetX = -offsetY * rotateAmplitude;

        if (!modalTiltAnimationId) {
            modalTiltAnimationId = requestAnimationFrame(animateTilt);
        }
    }

    function onMouseLeave() {
        tiltTargetX = 0;
        tiltTargetY = 0;
        if (!modalTiltAnimationId) {
            modalTiltAnimationId = requestAnimationFrame(animateTilt);
        }
    }

    // Attach event listeners (remove old ones first to prevent duplicates)
    modalContent.removeEventListener('mousemove', onMouseMove);
    modalContent.removeEventListener('mouseleave', onMouseLeave);
    modalContent.addEventListener('mousemove', onMouseMove);
    modalContent.addEventListener('mouseleave', onMouseLeave);
}

// ==================== INIT: MODAL CLOSE HANDLERS ====================
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeDetailModal();
        });
    }

    if (overlay) {
        // Close on overlay background click (not on modal content)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDetailModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                closeDetailModal();
            }
        });
    }
});

// ==================== NAVIGATION ====================
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('nav-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    const navLinks = document.querySelectorAll('.nav-link');

    // Floating header scroll behavior: auto-hide on scroll down, show on scroll up
    // Only works when Lenis is available
    let lastScrollY = window.scrollY;
    let scrollDownTimer = null;
    const SCROLL_THRESHOLD = 50;

    // Entrance: add a subtle drop-in animation on load (skip if prefers-reduced-motion)
    if (navbar && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(navbar, { opacity: 0, y: -20 });
        gsap.to(navbar, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.3,
            ease: 'power3.out'
        });
    } else if (navbar) {
        // Ensure visible even without animation
        gsap.set(navbar, { opacity: 1, y: 0 });
    }

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;

        // Add/remove scrolled class
        if (currentScrollY > SCROLL_THRESHOLD) {
            navbar.classList.add('scrolled');

            // Auto-hide: hide when scrolling down past the hero, show when scrolling up
            if (scrollDelta > 12 && currentScrollY > 200) {
                // Scrolling DOWN significantly — hide navbar
                navbar.classList.add('nav-hidden');
                // Clear any pending show timer
                if (scrollDownTimer) {
                    clearTimeout(scrollDownTimer);
                    scrollDownTimer = null;
                }
            } else if (scrollDelta < -5) {
                // Scrolling UP — show navbar with slight delay for smoothness
                if (!scrollDownTimer) {
                    scrollDownTimer = setTimeout(() => {
                        navbar.classList.remove('nav-hidden');
                        scrollDownTimer = null;
                    }, 100);
                }
            }
        } else {
            navbar.classList.remove('scrolled');
            navbar.classList.remove('nav-hidden');
            navbar.classList.add('nav-top');
        }

        // nav-top is already managed in the outer if/else block above

        // Update active nav link based on scroll position
        updateActiveNavLink();

        lastScrollY = currentScrollY;
    });

    // Mobile navigation toggle
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            mobileNavOverlay.classList.toggle('active');
            document.body.style.overflow = mobileNavOverlay.classList.contains('active') ? 'hidden' : '';
        });
    }

    // Close mobile nav on link click
    if (mobileNavLinks) {
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                mobileNavOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // Update active nav link
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('.section');
        const scrollPosition = window.scrollY + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
}

// ==================== SCROLL PROGRESS ====================
function initScrollProgress() {
    const scrollProgress = document.getElementById('scroll-progress');

    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        scrollProgress.style.width = `${scrolled}%`;
    });
}

// ==================== HERO ANIMATIONS ====================
function initHeroAnimations() {
    // Hero text entrance animation
    const heroTimeline = gsap.timeline({ delay: 0.5 });

    heroTimeline
        .from('.hero-title-area', {
            opacity: 0,
            y: 40,
            duration: 1,
            ease: 'power3.out'
        })
        .to('.tp-wrapper-secondary', {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out'
        }, '-=0.2')
        .to('.hero-subtitle', {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out'
        }, '-=0.3')
        .to('.hero-description', {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out'
        }, '-=0.3')
        .to('.hero-extra-text', {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out'
        }, '-=0.3')
        .to('.hero-cta-group', {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out'
        }, '-=0.3');

    // Hero parallax on scroll
    gsap.to('.hero-text', {
        scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom top',
            scrub: 1
        },
        y: -100,
        opacity: 0
    });
}

// ==================== SERVICE CARDS ====================
function initServiceCards() {
    const cards = document.querySelectorAll('.service-card');

    cards.forEach(card => {
        // 3D tilt effect on mouse move
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;

            // Move glow effect
            const glow = card.querySelector('.service-glow');
            if (glow) {
                glow.style.left = `${x}px`;
                glow.style.top = `${y}px`;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ==================== PORTFOLIO CAROUSEL ====================
function initPortfolioCarousel() {
    const carousel = document.getElementById('portfolio-carousel');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Re-query items AFTER dynamic content is loaded
    let items = document.querySelectorAll('.portfolio-item');
    
    if (!carousel || items.length === 0) return;

    let currentIndex = 0;
    let itemWidth = 430; // 400px + 30px gap
    let maxIndex = Math.max(0, items.length - Math.floor(carousel.parentElement.offsetWidth / itemWidth));

    // Update carousel position
    function updateCarousel() {
        const offset = -currentIndex * itemWidth;
        carousel.style.transform = `translateX(${offset}px)`;

        // Update button states
        if (prevBtn) prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
        if (nextBtn) nextBtn.style.opacity = currentIndex >= maxIndex ? '0.5' : '1';
    }

    // Previous button
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });
    }

    // Next button
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel();
            }
        });
    }

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;

            // Re-query items to include newly added dynamic items
            items = document.querySelectorAll('.portfolio-item');

            // Filter items
            items.forEach(item => {
                const category = item.dataset.category;
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    gsap.fromTo(item,
                        { opacity: 0, scale: 0.8 },
                        { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }
                    );
                } else {
                    item.style.display = 'none';
                }
            });

            // Reset carousel position
            currentIndex = 0;
            maxIndex = Math.max(0, items.length - Math.floor(carousel.parentElement.offsetWidth / itemWidth));
            updateCarousel();
        });
    });

    // Touch/drag support for carousel
    let isDragging = false;
    let startX = 0;

    carousel.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        carousel.style.cursor = 'grabbing';
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const diff = e.clientX - startX;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            } else if (diff < 0 && currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel();
            }
            isDragging = false;
        }
    });

    carousel.addEventListener('mouseup', () => {
        isDragging = false;
        carousel.style.cursor = 'grab';
    });

    carousel.addEventListener('mouseleave', () => {
        isDragging = false;
        carousel.style.cursor = 'grab';
    });

    // Touch support
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    carousel.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            } else if (diff < 0 && currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel();
            }
        }
    });

    // Initial state
    carousel.style.cursor = 'grab';
    updateCarousel();

    // Recalculate on resize
    window.addEventListener('resize', () => {
        items = document.querySelectorAll('.portfolio-item');
        maxIndex = Math.max(0, items.length - Math.floor(carousel.parentElement.offsetWidth / itemWidth));
        updateCarousel();
    });
}

// ==================== GEAR SHOWCASE ====================
function initGearShowcase() {
    // Re-query items AFTER dynamic content is loaded
    const gearItems = document.querySelectorAll('.gear-item');
    
    if (gearItems.length === 0) return;

    // Click/hover interaction for gear items
    gearItems.forEach((item, index) => {
        item.addEventListener('mouseenter', () => {
            gearItems.forEach(gi => gi.classList.remove('active'));
            item.classList.add('active');
        });

        // Note: Click is now handled by loadPocketbaseCMS() which opens the detail modal.
        // Remove any legacy tooltip toggle behavior to avoid conflicting with the modal.
        item.addEventListener('click', (e) => {
            // Do NOT toggle tooltip here — the modal click handler takes priority.
            // Just highlight the item briefly.
            gearItems.forEach(gi => gi.classList.remove('active'));
            item.classList.add('active');
            setTimeout(() => item.classList.remove('active'), 1500);
        });
    });
}

// ==================== LIQUID GLASS EFFECT ====================
function initLiquidGlass() {
    const glassCards = document.querySelectorAll('.glass-card');

    glassCards.forEach(card => {
        // Track mouse position for liquid glass refraction effect
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });
}

// ==================== CONTACT FORM ====================
function initContactForm() {
    const form = document.getElementById('contact-form');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validate
            if (!data.name || !data.email || !data.message) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            const submitBtn = form.querySelector('.submit-button');
            const originalText = submitBtn.innerHTML;

            submitBtn.innerHTML = '<span class="submit-text">Sending...</span>';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    submitBtn.innerHTML = '<span class="submit-text">✓ Message Sent!</span>';
                    form.reset();
                    showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                submitBtn.innerHTML = '<span class="submit-text">✗ Failed</span>';
                showNotification('Something went wrong. Please try again or contact us directly.', 'error');
            } finally {
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }, 2500);
            }
        });
    }

    // Notification function
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#10B981' : '#EF4444'};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// ==================== SMOOTH SCROLL (Lenis-powered) ====================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target && lenis) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.scrollY - headerOffset;

                lenis.scrollTo(offsetPosition, {
                    duration: 1.6,
                    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                });
            }
        });
    });
}

// ==================== SCROLL ANIMATIONS (Lenis + GSAP) ====================
// ==================== SCROLL-DRIVEN BODY BACKGROUND ====================
/**
 * Drives the page body background-color through cinematic color stops
 * as the user scrolls.
 * = 5 cinematic color stops across sections
 * = scroll-driven radial spotlight (light source)
 * = atmospheric dual-tone gradient with ambient "breathing"
 * = lens flare / light leak at section boundaries
 * = scroll-responsive film grain intensity
 * = dynamic vignette that shifts center with scroll
 *
 * Color journey: Purple (hero) → Bronze (services) → Sapphire (portfolio) → Teal (gear) → Amber (contact)
 */
function initScrollBackground() {
    // ── 1. COLOR STOPS ──
    const stops = [
        { section: '#hero',     color: '#2A0A4E', atmosphere: 'rgba(60,20,100,0.15),rgba(20,5,40,0.25)' },
        { section: '#services', color: '#4E180A', atmosphere: 'rgba(100,40,15,0.15),rgba(40,10,5,0.25)' },
        { section: '#portfolio',color: '#0E184E', atmosphere: 'rgba(20,30,100,0.15),rgba(5,10,40,0.25)' },
        { section: '#gear',     color: '#084E2A', atmosphere: 'rgba(10,100,50,0.15),rgba(5,40,20,0.25)' },
        { section: '#contact',  color: '#4E2A0A', atmosphere: 'rgba(100,50,15,0.15),rgba(40,20,5,0.25)' }
    ];

    const hexToRgb = hex => ({
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    });

    const colors = stops.map(s => hexToRgb(s.color));

    // Grab DOM references
    const body = document.body;
    const lightSource = document.getElementById('bg-light-source');
    const atmosphere = document.getElementById('bg-atmosphere');
    const lensFlare = document.getElementById('bg-lens-flare');
    const dynamicVignette = document.getElementById('bg-dynamic-vignette');
    const grain = document.getElementById('film-grain');

    // Set initial body background
    body.style.backgroundColor = stops[0].color;

    // Ambient breathing animation state: tracks an oscillating value [0, 1]
    let breathPhase = 0;

    // ── 2. BODY BACKGROUND COLOR TRANSITIONS (via ScrollTrigger, per section) ──
    for (let i = 0; i < stops.length - 1; i++) {
        const el = document.querySelector(stops[i].section);
        const endEl = document.querySelector(stops[i + 1].section);
        if (!el || !endEl) continue;

        const from = colors[i], to = colors[i + 1];

        ScrollTrigger.create({
            trigger: el,
            start: 'bottom bottom',
            endTrigger: endEl,
            end: 'top top',
            scrub: 1,
            onUpdate: self => {
                const t = self.progress;
                body.style.backgroundColor = `rgb(${
                    Math.round(from.r + (to.r - from.r) * t)
                },${
                    Math.round(from.g + (to.g - from.g) * t)
                },${
                    Math.round(from.b + (to.b - from.b) * t)
                })`;
            }
        });
    }

    // ── 3. SCROLL-DRIVEN LIGHT SOURCE (radial spotlight follows scroll) ──
    // Dual light: cool spotlight moves from top-center down, warm fill moves from bottom-left up
    // Both set as comma-separated backgrounds on one element — zero DOM thrashing
    if (lightSource) {
        ScrollTrigger.create({
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,
            onUpdate: self => {
                const p = self.progress;
                const centerY = 20 + p * 60;           // spotlight descends 20% → 80%
                const radius = 50 + (1 - p) * 20;       // radius shrinks with depth
                const cx2 = 20 + p * 60;                // warm light moves right
                const cy2 = 80 - p * 60;                // warm light moves up
                lightSource.style.background = [
                    `radial-gradient(ellipse ${radius}% ${radius * 0.65}% at 50% ${centerY}%, rgba(200,160,255,0.08) 0%, transparent 70%)`,
                    `radial-gradient(ellipse 40% 40% at ${cx2}% ${cy2}%, rgba(255,180,80,0.05) 0%, transparent 60%)`
                ].join(', ');
            }
        });
    }

    // ── 4. ATMOSPHERIC GRADIENT + AMBIENT BREATHING ──
    // Atmosphere hue shifts per section via ScrollTrigger
    // Ambient breathing (sinusoidal oscillation) runs via GSAP ticker
    let currentAtmosphere = stops[0].atmosphere;
    
    for (let i = 0; i < stops.length; i++) {
        const el = document.querySelector(stops[i].section);
        if (!el) continue;
        
        ScrollTrigger.create({
            trigger: el,
            start: 'top center',
            end: 'bottom center',
            onEnter: () => { currentAtmosphere = stops[i].atmosphere; },
            onEnterBack: () => { currentAtmosphere = stops[i].atmosphere; }
        });
    }

    // Ambient breathing animation via GSAP ticker (60fps sinusoidal oscillation)
    if (atmosphere) {
        gsap.ticker.add(() => {
            breathPhase += 0.008;
            const breathe = Math.sin(breathPhase) * 0.15 + 0.85; // oscillates 0.7 → 1.0
            const opacityBase = 0.2 * breathe;
            atmosphere.style.opacity = opacityBase;
            atmosphere.style.background = `linear-gradient(180deg, ${currentAtmosphere})`;
        });
    }

    // ── 5. LENS FLARE / LIGHT LEAK AT SECTION BOUNDARIES ──
    // When crossing between sections, a brief warm light streak appears
    if (lensFlare) {
        const flareAnim = gsap.timeline({ paused: true })
            .to(lensFlare, {
                opacity: 0.5,
                scale: 1.15,
                duration: 0.25,
                ease: 'power2.out'
            })
            .to(lensFlare, {
                opacity: 0,
                scale: 1,
                duration: 0.6,
                ease: 'power2.in'
            });

        // Trigger flare at each section boundary
        for (let i = 1; i < stops.length; i++) {
            const boundaryEl = document.querySelector(stops[i].section);
            if (!boundaryEl) continue;

            ScrollTrigger.create({
                trigger: boundaryEl,
                start: 'top bottom',
                onEnter: () => { flareAnim.restart(); },
                onEnterBack: () => { flareAnim.restart(); }
            });
        }

        // Set initial lens flare gradient
        lensFlare.style.background = 'linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.15) 20%, rgba(255,150,50,0.1) 40%, transparent 60%)';
        lensFlare.style.transformOrigin = '50% 60%';
    }

    // ── 6. SCROLL-RESPONSIVE FILM GRAIN ──
    // Grain opacity increases slightly as scroll depth increases
    if (grain) {
        // Scroll drift
        gsap.to(grain, {
            scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.5 },
            backgroundPosition: '0px 500px',
            ease: 'none'
        });

        // Grain intensity grows with scroll depth
        ScrollTrigger.create({
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
            onUpdate: self => {
                const intensity = 0.04 + self.progress * 0.06; // 0.04 → 0.10
                grain.style.opacity = intensity;
            }
        });
    }

    // ── 7. DYNAMIC VIGNETTE (center shifts with scroll) ──
    if (dynamicVignette) {
        // Vignette pulses subtly through the breathing phase
        ScrollTrigger.create({
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
            onUpdate: self => {
                const p = self.progress;
                // Vignette center shifts from 50%50% (top) to 50%70% (bottom)
                const centerY = 50 + p * 20;
                // Vignette darkens slightly at the bottom
                const edgeDarkness = 0.5 + p * 0.15;
                dynamicVignette.style.background = `radial-gradient(ellipse 100% 90% at 50% ${centerY}%, transparent ${30 - p * 10}%, rgba(0,0,0,${edgeDarkness}) 100%)`;
            }
        });
    }

    console.log('🎬 Cinematic Background System initialized:', stops.map(s => s.color).join(' → '));
}

function initScrollAnimations() {
    // Global GSAP defaults for 60FPS performance
    gsap.config({
        force3D: true,
        nullTargetWarn: false
    });

    // Smooth scroll-reveal animations for section headers
    initSectionHeaderAnimations();

    // Smooth scroll-reveal animations for service cards
    initServiceCardsSmooth();

    // Smooth scroll-reveal animations for portfolio items (dynamic)
    initPortfolioSmooth();

    // Smooth scroll-reveal animations for gear items (dynamic)
    initGearSmooth();

    // Smooth scroll-reveal animations for contact section
    initContactSmooth();

    // Smooth scroll-reveal animations for glass cards
    initGlassCardsSmooth();

    // Initialize scroll-driven cinematic background color transitions
    initScrollBackground();

    // Refresh ScrollTrigger after all animations are set up
    // so GSAP calculates the positions of new custom-sized layout elements accurately
    ScrollTrigger.refresh();
}

// ==================== SECTION HEADER ANIMATIONS ====================
function initSectionHeaderAnimations() {
    const sectionHeaders = document.querySelectorAll('.section-header');

    sectionHeaders.forEach(header => {
        const tag = header.querySelector('.section-tag');
        const title = header.querySelector('.section-title');
        const subtitle = header.querySelector('.section-subtitle');

        const elements = [tag, title, subtitle].filter(el => el);

        if (elements.length === 0) return;

        // Set initial states - opacity from right
        gsap.set(elements, {
            opacity: 0,
            x: 60,
            y: 20
        });

        // Create smooth timeline with scrub
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: header,
                start: 'top 75%',
                end: 'top 30%',
                scrub: 1
            }
        });

        // Staggered reveal with opacity from right
        elements.forEach((el, i) => {
            tl.to(el, {
                opacity: 1,
                x: 0,
                y: 0,
                duration: 1,
                ease: 'power2.out'
            }, i * 0.15);
        });
    });
}

// ==================== SERVICE CARDS SMOOTH ====================
function initServiceCardsSmooth() {
    const cards = document.querySelectorAll('.service-card');

    cards.forEach((card, index) => {
        // Set initial state - hidden, translated from right with opacity
        gsap.set(card, {
            opacity: 0,
            x: 80,
            y: 30
        });

        // Smooth scrub animation
        gsap.to(card, {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 80%',
                end: 'top 40%',
                scrub: 1
            },
            delay: index * 0.1
        });
    });
}

// ==================== PORTFOLIO SMOOTH ====================
function initPortfolioSmooth() {
    // Re-query items to include dynamically loaded items
    const items = document.querySelectorAll('.portfolio-item');

    items.forEach((item, index) => {
        // Set initial state - opacity from right
        gsap.set(item, {
            opacity: 0,
            x: 100,
            y: 40
        });

        // Smooth scrub animation
        gsap.to(item, {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '.portfolio-carousel-wrapper',
                start: 'top 75%',
                end: 'top 35%',
                scrub: 1
            },
            delay: index * 0.12
        });
    });
}

// ==================== GEAR SMOOTH ====================
function initGearSmooth() {
    // Re-query items to include dynamically loaded items
    const gearItems = document.querySelectorAll('.gear-item');

    gearItems.forEach((item, index) => {
        // Alternate direction based on index
        const startX = index % 2 === 0 ? -60 : 60;

        // Set initial state
        gsap.set(item, {
            opacity: 0,
            x: startX,
            y: 20
        });

        // Smooth scrub animation
        gsap.to(item, {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: item,
                start: 'top 80%',
                end: 'top 45%',
                scrub: 1
            },
            delay: index * 0.08
        });
    });
}

// ==================== CONTACT SMOOTH ====================
function initContactSmooth() {
    const contactItems = document.querySelectorAll('.contact-item');
    const contactForm = document.querySelector('.contact-form-wrapper');

    // Animate contact items
    contactItems.forEach((item, index) => {
        gsap.set(item, {
            opacity: 0,
            x: 60,
            y: 20
        });

        gsap.to(item, {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: item,
                start: 'top 80%',
                end: 'top 45%',
                scrub: 1
            },
            delay: index * 0.1
        });
    });

    // Animate contact form
    if (contactForm) {
        gsap.set(contactForm, {
            opacity: 0,
            x: 80,
            y: 30
        });

        gsap.to(contactForm, {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 1.2,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: contactForm,
                start: 'top 80%',
                end: 'top 40%',
                scrub: 1
            }
        });
    }
}

// ==================== GLASS CARDS SMOOTH ====================
function initGlassCardsSmooth() {
    const glassCards = document.querySelectorAll('.glass-card:not(.service-card):not(.portfolio-item):not(.gear-item)');

    glassCards.forEach((card, index) => {
        // Set initial state - opacity from right
        gsap.set(card, {
            opacity: 0,
            x: 60,
            y: 30
        });

        // Smooth scrub animation
        gsap.to(card, {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 80%',
                end: 'top 40%',
                scrub: 1
            },
            delay: index * 0.08
        });
    });
}

// ==================== SCROLL FLOAT TITLE ANIMATION ====================
function initScrollFloatImproved() {
    const elements = document.querySelectorAll('[data-scroll-float]');
    if (!elements.length) return;

    elements.forEach(el => {
        const fragment = document.createDocumentFragment();

        el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const wordSpan = document.createElement('span');
                wordSpan.className = 'sf-word';
                text.split('').forEach(ch => {
                    const cs = document.createElement('span');
                    cs.className = 'sf-char';
                    cs.textContent = ch === ' ' ? '\u00A0' : ch;
                    wordSpan.appendChild(cs);
                });
                fragment.appendChild(wordSpan);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const clone = node.cloneNode(false);
                clone.classList.add('sf-word');
                const text = node.textContent;
                text.split('').forEach(ch => {
                    const cs = document.createElement('span');
                    cs.className = 'sf-char';
                    cs.textContent = ch === ' ' ? '\u00A0' : ch;
                    clone.appendChild(cs);
                });
                fragment.appendChild(clone);
            }
        });

        el.innerHTML = '';
        el.appendChild(fragment);

        const chars = el.querySelectorAll('.sf-char');

        // Set initial state - opacity from right
        gsap.set(chars, {
            opacity: 0,
            yPercent: 80,
            x: 30,
            scaleX: 0.85,
            scaleY: 1.5,
            transformOrigin: '50% 0%'
        });

        // Smooth scrub animation with improved timing
        gsap.to(chars, {
            opacity: 1,
            yPercent: 0,
            x: 0,
            scaleX: 1,
            scaleY: 1,
            duration: 1,
            ease: 'power2.out',
            stagger: 0.02,
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                end: 'top 40%',
                scrub: 1
            }
        });
    });
}

// ==================== UTILITY FUNCTIONS ====================
// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== GLASS SURFACE ADAPTOR ====================
function initGlassSurface() {
    const glassElements = document.querySelectorAll('.glass-surface');
    if (glassElements.length === 0) return;

    // Feature detection for SVG backdrop-filter support
    const supportsSVGFilters = () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return false;

        const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        const isFirefox = /Firefox/.test(navigator.userAgent);
        if (isWebkit || isFirefox) return false;

        const div = document.createElement('div');
        div.style.backdropFilter = 'url(#glass-filter-test)';
        return div.style.backdropFilter !== '';
    };

    const svgSupported = supportsSVGFilters();

    glassElements.forEach((el, index) => {
        const uniqueId = `gs-${index}-${Math.floor(Math.random() * 10000)}`;
        const filterId = `glass-filter-${uniqueId}`;
        const redGradId = `red-grad-${uniqueId}`;
        const blueGradId = `blue-grad-${uniqueId}`;

        // Read options from data attributes or fallback to defaults
        const borderRadius = el.hasAttribute('data-border-radius') ? parseFloat(el.getAttribute('data-border-radius')) : 20;
        const borderWidth = el.hasAttribute('data-border-width') ? parseFloat(el.getAttribute('data-border-width')) : 0.07;
        const brightness = el.hasAttribute('data-brightness') ? parseFloat(el.getAttribute('data-brightness')) : 50;
        const opacity = el.hasAttribute('data-opacity') ? parseFloat(el.getAttribute('data-opacity')) : 0.93;
        const blur = el.hasAttribute('data-blur') ? parseFloat(el.getAttribute('data-blur')) : 11;
        const displace = el.hasAttribute('data-displace') ? parseFloat(el.getAttribute('data-displace')) : 0;
        const distortionScale = el.hasAttribute('data-distortion-scale') ? parseFloat(el.getAttribute('data-distortion-scale')) : -180;
        const redOffset = el.hasAttribute('data-red-offset') ? parseFloat(el.getAttribute('data-red-offset')) : 0;
        const greenOffset = el.hasAttribute('data-green-offset') ? parseFloat(el.getAttribute('data-green-offset')) : 10;
        const blueOffset = el.hasAttribute('data-blue-offset') ? parseFloat(el.getAttribute('data-blue-offset')) : 20;
        const xChannel = el.getAttribute('data-x-channel') || 'R';
        const yChannel = el.getAttribute('data-y-channel') || 'G';
        const mixBlendMode = el.getAttribute('data-mix-blend-mode') || 'difference';
        const backgroundOpacity = el.hasAttribute('data-background-opacity') ? parseFloat(el.getAttribute('data-background-opacity')) : 0;
        const saturation = el.hasAttribute('data-saturation') ? parseFloat(el.getAttribute('data-saturation')) : 1;

        // Wrap existing content inside a container (.glass-surface__content)
        const contentContainer = document.createElement('div');
        contentContainer.className = 'glass-surface__content';

        // Move all children of el to contentContainer
        while (el.firstChild) {
            contentContainer.appendChild(el.firstChild);
        }

        // Create SVG filter element
        const svgNs = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNs, "svg");
        svg.setAttribute("class", "glass-surface__filter");
        svg.setAttribute("xmlns", svgNs);

        svg.innerHTML = `
          <defs>
            <filter id="${filterId}" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">
              <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
              <feDisplacementMap in="SourceGraphic" in2="map" id="${filterId}-redchannel" result="dispRed" />
              <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
              <feDisplacementMap in="SourceGraphic" in2="map" id="${filterId}-greenchannel" result="dispGreen" />
              <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
              <feDisplacementMap in="SourceGraphic" in2="map" id="${filterId}-bluechannel" result="dispBlue" />
              <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
              <feBlend in="red" in2="green" mode="screen" result="rg" />
              <feBlend in="rg" in2="blue" mode="screen" result="output" />
              <feGaussianBlur id="${filterId}-blur" in="output" stdDeviation="0.7" />
            </filter>
          </defs>
        `;

        // Append SVG and content container to element
        el.appendChild(svg);
        el.appendChild(contentContainer);

        const feImage = svg.querySelector('feImage');
        const redChannel = svg.getElementById(`${filterId}-redchannel`);
        const greenChannel = svg.getElementById(`${filterId}-greenchannel`);
        const blueChannel = svg.getElementById(`${filterId}-bluechannel`);
        const gaussianBlur = svg.getElementById(`${filterId}-blur`);

        const generateDisplacementMap = () => {
            const rect = el.getBoundingClientRect();
            const actualWidth = rect.width || 200;
            const actualHeight = rect.height || 80;
            const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

            const svgContent = `
              <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#0000"/>
                    <stop offset="100%" stop-color="red"/>
                  </linearGradient>
                  <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#0000"/>
                    <stop offset="100%" stop-color="blue"/>
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
                <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
              </svg>
            `;

            return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
        };

        const updateDisplacementMap = () => {
            if (feImage) {
                feImage.setAttribute('href', generateDisplacementMap());
            }
        };

        // Initial setup of displacement map parameters
        if (redChannel) {
            redChannel.setAttribute('scale', (distortionScale + redOffset).toString());
            redChannel.setAttribute('xChannelSelector', xChannel);
            redChannel.setAttribute('yChannelSelector', yChannel);
        }
        if (greenChannel) {
            greenChannel.setAttribute('scale', (distortionScale + greenOffset).toString());
            greenChannel.setAttribute('xChannelSelector', xChannel);
            greenChannel.setAttribute('yChannelSelector', yChannel);
        }
        if (blueChannel) {
            blueChannel.setAttribute('scale', (distortionScale + blueOffset).toString());
            blueChannel.setAttribute('xChannelSelector', xChannel);
            blueChannel.setAttribute('yChannelSelector', yChannel);
        }
        if (gaussianBlur) {
            gaussianBlur.setAttribute('stdDeviation', displace.toString());
        }

        updateDisplacementMap();

        // Listen for resizing
        const resizeObserver = new ResizeObserver(() => {
            setTimeout(updateDisplacementMap, 0);
        });
        resizeObserver.observe(el);

        // Apply inline styles to element
        el.style.setProperty('--glass-frost', backgroundOpacity);
        el.style.setProperty('--glass-saturation', saturation);
        el.style.setProperty('--filter-id', `url(#${filterId})`);

        if (svgSupported) {
            el.classList.add('glass-surface--svg');
        } else {
            el.classList.add('glass-surface--fallback');
        }

        // ── Mouse-reactive displacement tracking ──
        // When data-mouse-reactive="true", cursor movement dynamically shifts
        // the displacement-map gradients so the liquid glass effect responds to
        // the pointer position, creating an organic living-glass feel.
        if (el.getAttribute('data-mouse-reactive') === 'true') {
            let mouseRAF = null;
            let mouseX = 0.5;
            let mouseY = 0.5;
            let currentMouseX = 0.5;
            let currentMouseY = 0.5;

            const onMouseMove = (e) => {
                const rect = el.getBoundingClientRect();
                mouseX = (e.clientX - rect.left) / rect.width;
                mouseY = (e.clientY - rect.top) / rect.height;

                if (!mouseRAF) {
                    mouseRAF = requestAnimationFrame(updateMouseDisplacement);
                }
            };

            const updateMouseDisplacement = () => {
                // Smooth interpolation toward cursor position
                currentMouseX += (mouseX - currentMouseX) * 0.08;
                currentMouseY += (mouseY - currentMouseY) * 0.08;

                // Update CSS custom property for glow overlay (used by ::after pseudo-element)
                el.style.setProperty('--mouse-x', `${currentMouseX * 100}%`);
                el.style.setProperty('--mouse-y', `${currentMouseY * 100}%`);

                // Dynamically regenerate displacement map shifted toward cursor
                // This shifts the gradient origins, causing the RGB channels to
                // distort toward the cursor position — creating a "liquid magnet" effect
                if (feImage) {
                    const rect = el.getBoundingClientRect();
                    const actualWidth = rect.width || 200;
                    const actualHeight = rect.height || 80;
                    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

                    const redShift = Math.round((currentMouseX - 0.5) * 20);
                    const blueShift = Math.round((currentMouseY - 0.5) * 20);

                    const mouseSvgContent = `
                      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="${redGradId}" x1="${50 + redShift}%" y1="0%" x2="${50 - redShift}%" y2="0%">
                            <stop offset="0%" stop-color="#0000"/>
                            <stop offset="100%" stop-color="red"/>
                          </linearGradient>
                          <linearGradient id="${blueGradId}" x1="0%" y1="${50 + blueShift}%" x2="0%" y2="${50 - blueShift}%">
                            <stop offset="0%" stop-color="#0000"/>
                            <stop offset="100%" stop-color="blue"/>
                          </linearGradient>
                        </defs>
                        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
                        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
                        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
                        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
                      </svg>
                    `;
                    feImage.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(mouseSvgContent)}`);
                }

                mouseRAF = null;

                // Keep animating if still moving toward target
                if (Math.abs(currentMouseX - mouseX) > 0.001 ||
                    Math.abs(currentMouseY - mouseY) > 0.001) {
                    mouseRAF = requestAnimationFrame(updateMouseDisplacement);
                }
            };

            el.addEventListener('mousemove', onMouseMove);
            el.addEventListener('mouseleave', () => {
                // Smoothly return displacement to center
                mouseX = 0.5;
                mouseY = 0.5;
                if (!mouseRAF) {
                    mouseRAF = requestAnimationFrame(updateMouseDisplacement);
                }
            });
        }
    });
}

