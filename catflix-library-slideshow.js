// Catflix Library Slideshow - Jellyfin JS Injector Script

(function () {
    const CDN = 'https://cdn.jsdelivr.net/gh/Burtaan/Library-Jellyfin@main';

    // ── Add more images here as you get them ──────────────────────────────────
    const LIBRARY_IMAGES = {
        'movies': [
            `${CDN}/Movies-1.png`,
            `${CDN}/Movies-2.jpg`,
        ],
        'tvshows': [
            `${CDN}/Shows-1.png`,
            `${CDN}/Shows-2.png`,
        ]
    };
    // ─────────────────────────────────────────────────────────────────────────

    const INTERVAL_MS = 5000;
    const FADE_MS     = 600;

    function injectOverlay(card, images) {
        if (card._catflixSlideshow) return;

        const type = card.dataset.collectiontype;
        if (!type || !LIBRARY_IMAGES[type]) return;

        const container = card.querySelector('.cardScalable');
        if (!container) return;

        card._catflixSlideshow = true;

        // Two overlapping img elements for crossfade
        const imgA = document.createElement('img');
        const imgB = document.createElement('img');

        const baseStyle = `
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

        imgA.style.cssText = baseStyle + 'opacity: 1;';
        imgB.style.cssText = baseStyle + 'opacity: 0;';

        container.style.position = 'relative';
        container.appendChild(imgA);
        container.appendChild(imgB);

        let index = Math.floor(Math.random() * images.length);
        imgA.src = images[index];

        if (images.length <= 1) return;

        let useA = true;

        setInterval(() => {
            index = (index + 1) % images.length;
            const next = useA ? imgB : imgA;
            const current = useA ? imgA : imgB;

            // Load next image into the hidden layer
            next.src = images[index];
            next.style.opacity = '1';

            // After crossfade, hide the old layer
            setTimeout(() => {
                current.style.opacity = '0';
                useA = !useA;
            }, FADE_MS);

        }, INTERVAL_MS);
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
