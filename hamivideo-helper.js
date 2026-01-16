// ==UserScript==
// @name         HamiVideo Helper
// @namespace    http://tampermonkey.net/
// @version      0.3
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

    // Function to remove the slow div
    const slowDivRemover = () => {
        const slowDiv = document.getElementById("slow"); 
        if (!slowDiv || !slowDiv.style) return ;
        if (slowDiv.style.display !== "none") {
            slowDiv.style.display = "none"; 
        }
    };

    // Function to click and play video
    const clickAndPlay = () => {
        const cover = document.querySelector("#player > div"); 
        if (!cover) return; 
        if (cover.innerHTML.includes("秒後自動播放")) 
            cover.click(); 
    }

    document.addEventListener("keydown", (event) => {
        // Fast forward 1:25 (85 seconds) when pressing Ctrl + ArrowRight
        if (event.ctrlKey && event.key === 'ArrowRight') {
            const video = document.querySelector('#h5video');
            if (video) video.currentTime += 85;
        }
        if (event.ctrlKey && event.key === 'ArrowLeft') {
            const video = document.querySelector('#h5video');
            if (video) video.currentTime -= 85;
        }
    })

    // Run immediately
    transformLink();
    setInterval(slowDivRemover, 500);
    setInterval(clickAndPlay, 500);

    // Optional: Use an Observer if the content loads dynamically (AJAX)
    const observer = new MutationObserver(transformLink);
    observer.observe(document.body, { childList: true, subtree: true });
})();