// Catflix Library Slideshow - Jellyfin JS Injector Script

(function () {
    const CDN = 'https://raw.githubusercontent.com/Burtaan/Library-Jellyfin/main';

    // ── Add more images here as you get them ──────────────────────────────────
    const LIBRARY_IMAGES = {
        'movies': [
            `${CDN}/Movies-1.png`,
        ],
        'tvshows': [
            `${CDN}/Shows-1.png`,
        ]
    };
    // ─────────────────────────────────────────────────────────────────────────

    const INTERVAL_MS = 5000;
    const FADE_MS     = 800;

    function injectOverlay(card, images) {
        if (card._catflixSlideshow) return;

        const type = card.dataset.collectiontype;
        if (!type || !LIBRARY_IMAGES[type]) return;

        const container = card.querySelector('.cardScalable');
        if (!container) return;

        card._catflixSlideshow = true;

        // Create overlay img on top of everything
        const overlay = document.createElement('img');
        overlay.src = images[0];
        overlay.style.cssText = `
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 2;
            border-radius: inherit;
            pointer-events: none;
            transition: opacity ${FADE_MS}ms ease;
        `;
        container.style.position = 'relative';
        container.appendChild(overlay);

        if (images.length > 1) {
            let index = 0;
            setInterval(() => {
                index = (index + 1) % images.length;
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.src = images[index];
                    overlay.style.opacity = '1';
                }, FADE_MS);
            }, INTERVAL_MS);
        }
    }

    function processCards() {
        document.querySelectorAll('[data-collectiontype]').forEach(card => {
            const type = card.dataset.collectiontype;
            if (!type) return;
            const images = LIBRARY_IMAGES[type];
            if (!images || !images.length) return;
            injectOverlay(card, images);
        });
    }

    new MutationObserver(processCards)
        .observe(document.body, { childList: true, subtree: true });

    setTimeout(processCards, 500);
    setTimeout(processCards, 1500);

})();
