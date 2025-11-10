/**
 * View Transitions API - Native cross-document transitions
 * Uses the Navigation API for smooth page transitions
 * Requires <meta name="view-transition" content="same-origin">
 */

(function() {
    'use strict';

    // Check if browser supports View Transitions API and Navigation API
    if (!('navigation' in window) || !CSS.supports('view-transition-name', 'test')) {
        console.log('View Transitions or Navigation API not supported');
        return;
    }

    /**
     * Intercept same-origin link clicks and use Navigation API
     */
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');

        // Ignore if no link, has target, or is a download
        if (!a || a.target || a.hasAttribute('download')) return;

        const url = new URL(a.href, location.href);

        // Only intercept same-origin links
        if (url.origin !== location.origin) return;

        // Let hash links scroll normally
        if (url.pathname === location.pathname && url.hash) return;

        // Prevent default and use Navigation API
        e.preventDefault();
        navigation.navigate(url.href);
    });

    /**
     * Add loading indicator during transitions
     */
    function addLoadingIndicator() {
        const style = document.createElement('style');
        style.textContent = `
            .page-loading {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(90deg, transparent, #e74c3c, transparent);
                animation: loading 1.5s ease-in-out infinite;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s;
            }

            .page-loading.active {
                opacity: 1;
            }

            @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `;
        document.head.appendChild(style);

        const indicator = document.createElement('div');
        indicator.className = 'page-loading';
        indicator.id = 'page-loading-indicator';
        document.body.appendChild(indicator);
    }

    /**
     * Show/hide loading indicator
     */
    function showLoading(show) {
        const indicator = document.getElementById('page-loading-indicator');
        if (indicator) {
            if (show) {
                indicator.classList.add('active');
            } else {
                setTimeout(() => indicator.classList.remove('active'), 300);
            }
        }
    }

    // Listen for navigation events
    if (navigation) {
        navigation.addEventListener('navigate', (e) => {
            showLoading(true);
        });

        navigation.addEventListener('navigatesuccess', () => {
            showLoading(false);
        });

        navigation.addEventListener('navigateerror', () => {
            showLoading(false);
        });
    }

    // Initialize loading indicator
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addLoadingIndicator);
    } else {
        addLoadingIndicator();
    }

})();
