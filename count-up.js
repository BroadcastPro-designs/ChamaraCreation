/**
 * CountUp — Vanilla JS number counter animation
 *
 * Animates numeric values from 0 to a target number with easing.
 * Uses IntersectionObserver for scroll-triggered start.
 *
 * HTML usage:
 *   <span class="stat-number" data-count="500" data-suffix="+">0+</span>
 */
function initCountUp() {
    const elements = document.querySelectorAll('[data-count]');
    if (!elements.length) return;

    const instances = [];

    elements.forEach(el => {
        const target = parseFloat(el.getAttribute('data-count')) || 0;
        const suffix = el.getAttribute('data-suffix') || '';
        const prefix = el.getAttribute('data-prefix') || '';
        const duration = parseFloat(el.getAttribute('data-duration')) || 2000; // ms
        const delay = parseFloat(el.getAttribute('data-delay')) || 200;

        let animated = false;
        let observer = null;
        let animationFrame = null;
        let startTime = null;

        // Set initial display
        el.textContent = prefix + '0' + suffix;

        // ── Easing function (ease-out cubic) ──
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        // ── Animation loop ──
        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            const currentValue = Math.round(easedProgress * target);

            el.textContent = prefix + currentValue + suffix;

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                // Ensure final value is exact
                el.textContent = prefix + target + suffix;
                animated = true;
                startTime = null;
            }
        }

        // ── Start animation after delay ──
        function startAnimation() {
            if (animated) return;
            setTimeout(() => {
                startTime = null;
                animationFrame = requestAnimationFrame(animate);
            }, delay);
        }

        // ── IntersectionObserver ──
        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !animated) {
                        startAnimation();
                        observer.disconnect();
                    }
                });
            },
            { threshold: 0.3 }
        );
        observer.observe(el);

        // ── Store for cleanup ──
        instances.push({
            element: el,
            destroy: () => {
                if (observer) observer.disconnect();
                if (animationFrame) cancelAnimationFrame(animationFrame);
            }
        });
    });

    return instances;
}
