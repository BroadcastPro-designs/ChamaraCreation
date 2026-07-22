/**
 * TextType — Vanilla JS port
 * Original React component: https://reactbits.dev/TextType
 *
 * Types out text character by character with a blinking cursor.
 * Supports IntersectionObserver for scroll-triggered start,
 * cursor blink animation, and custom speed/settings.
 */

function initTextType(elementOrSelector, options = {}) {
    const el = typeof elementOrSelector === 'string'
        ? document.querySelector(elementOrSelector)
        : elementOrSelector;

    if (!el) {
        console.warn('TextType: element not found', elementOrSelector);
        return null;
    }

    const {
        text = el.textContent || el.innerText || '',
        typingSpeed = 45,
        initialDelay = 400,
        showCursor = true,
        cursorCharacter = '|',
        cursorBlinkDuration = 0.5,
        startOnVisible = true,
        preserveHTML = false
    } = options;

    // State
    let displayedText = '';
    let currentCharIndex = 0;
    let isActive = false;
    let isComplete = false;
    let destroyed = false;

    // Save original text
    const originalContent = text.trim();

    // Clear the element's content but preserve a wrapper span for the typed text
    // We need to keep existing child elements (like <strong>) intact
    const typedContentSpan = document.createElement('span');
    typedContentSpan.className = 'text-type__content';
    typedContentSpan.textContent = '';

    // Create cursor span
    let cursorSpan = null;
    if (showCursor) {
        cursorSpan = document.createElement('span');
        cursorSpan.className = 'text-type__cursor';
        cursorSpan.textContent = cursorCharacter;
    }

    // If element has complex HTML content (e.g., <strong> tags), preserve structure
    if (preserveHTML) {
        // Store the original HTML and just clear text content
        el._originalHTML = el.innerHTML;
        el.innerHTML = '';
        el.appendChild(typedContentSpan);
        if (cursorSpan) el.appendChild(cursorSpan);
    } else {
        // Simple text: just use textContent
        el.innerHTML = '';
        el.appendChild(typedContentSpan);
        if (cursorSpan) el.appendChild(cursorSpan);
    }

    el.classList.add('text-type');

    // ── IntersectionObserver for scroll-triggered start ──
    let observer = null;
    if (startOnVisible) {
        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !isActive && !isComplete && !destroyed) {
                        isActive = true;
                        startTyping();
                        observer.disconnect();
                    }
                });
            },
            { threshold: 0.15 }
        );
        observer.observe(el);
    } else {
        // Start immediately after initial delay
        setTimeout(() => {
            if (!destroyed) {
                isActive = true;
                startTyping();
            }
        }, initialDelay);
    }

    // ── Typing Logic ──
    let typingTimeout = null;

    function typeNextChar() {
        if (destroyed) return;

        if (currentCharIndex < originalContent.length) {
            displayedText += originalContent[currentCharIndex];
            typedContentSpan.textContent = displayedText;
            currentCharIndex++;

            typingTimeout = setTimeout(typeNextChar, typingSpeed);
        } else {
            // Typing complete
            isComplete = true;
            isActive = false;
            if (cursorSpan) {
                cursorSpan.classList.add('text-type__cursor--done');
            }

            // Trigger completion callback
            if (options.onComplete) {
                options.onComplete(el);
            }
        }
    }

    function startTyping() {
        // Apply initial delay before first character
        typingTimeout = setTimeout(typeNextChar, initialDelay);
    }

    // ── Blinking Cursor via CSS animation ──
    // We add a CSS animation via a style tag or use the class
    // The CSS is handled in style.css via .text-type__cursor animation

    // ── Cleanup ──
    function destroy() {
        destroyed = true;
        if (typingTimeout) clearTimeout(typingTimeout);
        if (observer) observer.disconnect();
        el.classList.remove('text-type');
        // Restore original content
        if (el._originalHTML) {
            el.innerHTML = el._originalHTML;
        } else {
            el.textContent = originalContent;
        }
    }

    return { destroy, isComplete: () => isComplete };
}

/**
 * Initialize multiple TextType instances on elements with [data-typing] attribute.
 * Options can be set via data-typing-speed, data-typing-delay, etc.
 */
function initAllTextTypes() {
    const elements = document.querySelectorAll('[data-typing]');
    const instances = [];

    elements.forEach(el => {
        const text = el.getAttribute('data-typing-text') || el.textContent.trim();
        const speed = parseInt(el.getAttribute('data-typing-speed')) || 45;
        const delay = parseInt(el.getAttribute('data-typing-delay')) || 400;
        const preserve = el.hasAttribute('data-typing-preserve-html');

        const inst = initTextType(el, {
            text,
            typingSpeed: speed,
            initialDelay: delay,
            showCursor: true,
            cursorCharacter: '|',
            cursorBlinkDuration: 0.5,
            startOnVisible: true,
            preserveHTML: preserve
        });

        if (inst) instances.push(inst);
    });

    return instances;
}
