// ==UserScript==
// @name         HamiVideo Link Transformer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Replaces play link with product link for #btBack > a
// @author       D101028
// @match        https://hamivideo.hinet.net/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Function to perform the replacement
    const transformLink = () => {
        const linkElement = document.querySelector('#btBack > a');

        if (linkElement && linkElement.href) {
            const currentHref = window.location.href;

            // Regex to find 'play/' followed by 6 digits
            const match = currentHref.match(/play\/(\={0,1}\d{6})/);

            if (match && match[1]) {
                const videoId = match[1];
                const newHref = `https://hamivideo.hinet.net/hamivideo/product/${videoId}.do?cs=2`;

                // Only update if it hasn't been changed yet to avoid infinite loops
                if (currentHref !== newHref) {
                    linkElement.href = newHref;
                    linkElement.removeAttribute("onclick");
                    console.log('Link transformed to:', newHref);
                }
            }
        }
    };

    // Run immediately
    transformLink();

    // Optional: Use an Observer if the content loads dynamically (AJAX)
    const observer = new MutationObserver(transformLink);
    observer.observe(document.body, { childList: true, subtree: true });
})();