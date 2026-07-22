/**
 * TextPressure — Vanilla JS port
 * Original React component: https://codepen.io/JuanFuentes/full/rgXKGQ
 *
 * Dynamically varies font axes (weight, width, italic) of each character
 * based on its distance from the mouse cursor, creating a fluid
 * pressure/compression effect.
 *
 * Requirements:
 *   - A variable font that supports 'wght', 'wdth', and 'ital' axes
 *     (e.g. Roboto Flex from Google Fonts)
 *   - A container element with a known ID
 */

function initTextPressure(options = {}) {
    const {
        containerId = 'text-pressure-container',
        text = 'Chamara Creation',
        fontFamily = '"Roboto Flex", sans-serif',
        enableWidth = true,
        enableWeight = true,
        enableItalic = true,
        enableAlpha = false,
        enableFlex = true,
        enableStroke = true,
        enableScale = false,
        textColor = '#FFFFFF',
        strokeColor = '#E50914',
        minFontSize = 36,
        smoothing = 15
    } = options;

    // ── Element References ──
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`TextPressure: container "#${containerId}" not found`);
        return null;
    }

    // ── Split text into individual characters ──
    const chars = text.split('');
    const spans = [];

    // Create the title element
    const title = document.createElement('h1');
    title.className = 'tp-title';
    if (enableFlex) title.classList.add('tp-flex');
    if (enableStroke) title.classList.add('tp-stroke');

    chars.forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char; // non-breaking space for proper width
        span.setAttribute('data-char', char);
        span.style.display = 'inline-block';
        if (!enableStroke) {
            span.style.color = textColor;
        }
        title.appendChild(span);
        spans.push(span);
    });

    // Clear and populate container
    container.innerHTML = '';
    container.appendChild(title);

    // ── Set inline styles ──
    container.style.position = 'relative';
    container.style.width = '100%';

    title.style.fontFamily = fontFamily;
    title.style.textTransform = 'uppercase';
    title.style.margin = '0';
    title.style.textAlign = 'center';
    title.style.userSelect = 'none';
    title.style.whiteSpace = 'nowrap';
    title.style.fontWeight = '100';
    title.style.width = '100%';
    title.style.display = enableFlex ? 'flex' : 'block';
    title.style.justifyContent = enableFlex ? 'space-between' : 'normal';

    // ── Mouse / Cursor State ──
    const mouseRef = { x: 0, y: 0 };
    const cursorRef = { x: 0, y: 0 };

    // Initialize to center of container
    const initRect = container.getBoundingClientRect();
    mouseRef.x = initRect.left + initRect.width / 2;
    mouseRef.y = initRect.top + initRect.height / 2;
    cursorRef.x = mouseRef.x;
    cursorRef.y = mouseRef.y;

    // ── Event Handlers ──
    function handleMouseMove(e) {
        cursorRef.x = e.clientX;
        cursorRef.y = e.clientY;
    }

    function handleTouchMove(e) {
        const t = e.touches[0];
        if (t) {
            cursorRef.x = t.clientX;
            cursorRef.y = t.clientY;
        }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // ── Helper Functions ──
    function dist(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getAttr(distance, maxDist, minVal, maxVal) {
        const val = maxVal - Math.abs((maxVal * distance) / maxDist);
        return Math.max(minVal, val + minVal);
    }

    // ── Font Size Calculation ──
    function setSize() {
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width === 0) return;

        let newFontSize = containerRect.width / (chars.length / 2);
        newFontSize = Math.max(newFontSize, minFontSize);
        title.style.fontSize = newFontSize + 'px';
        title.style.lineHeight = '1';

        if (enableScale) {
            requestAnimationFrame(() => {
                const titleRect = title.getBoundingClientRect();
                if (titleRect.height > 0 && containerRect.height > 0) {
                    const yRatio = containerRect.height / titleRect.height;
                    title.style.transform = `scale(1, ${yRatio})`;
                    title.style.transformOrigin = 'center top';
                    title.style.lineHeight = yRatio;
                }
            });
        }
    }

    setSize();

    let resizeTimeout;
    function debouncedSetSize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(setSize, 100);
    }
    window.addEventListener('resize', debouncedSetSize);

    // ── Animation Loop ──
    let animating = true;
    let lastVariationSettings = '';

    function animate() {
        if (!animating || !title.parentNode) return;

        // Smooth interpolation of mouse position toward cursor
        mouseRef.x += (cursorRef.x - mouseRef.x) / smoothing;
        mouseRef.y += (cursorRef.y - mouseRef.y) / smoothing;

        const titleRect = title.getBoundingClientRect();
        const maxDist = Math.max(titleRect.width / 2, 100);

        spans.forEach(span => {
            if (!span || !span.parentNode) return;

            const rect = span.getBoundingClientRect();
            const charCenter = {
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2
            };

            const d = dist(mouseRef, charCenter);

            const wdth = enableWidth ? Math.floor(getAttr(d, maxDist, 25, 151)) : 100;
            const wght = enableWeight ? Math.floor(getAttr(d, maxDist, 100, 900)) : 400;
            const italVal = enableItalic ? getAttr(d, maxDist, 0, 1).toFixed(2) : 0;
            const alphaVal = enableAlpha ? getAttr(d, maxDist, 0.3, 1).toFixed(2) : 1;

            const variation = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal}`;

            if (span.style.fontVariationSettings !== variation) {
                span.style.fontVariationSettings = variation;
            }
            if (enableAlpha && span.style.opacity !== alphaVal) {
                span.style.opacity = alphaVal;
            }
        });

        requestAnimationFrame(animate);
    }

    // ── Start animation after a short delay to let page settle ──
    const animationStartDelay = setTimeout(() => {
        if (animating) {
            animate();
        }
    }, 1800);

    // ── Cleanup function ──
    function destroy() {
        animating = false;
        clearTimeout(animationStartDelay);
        clearTimeout(resizeTimeout);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('resize', debouncedSetSize);
    }

    // Store destroy on container for potential external cleanup
    container._tpDestroy = destroy;

    return { destroy };
}
