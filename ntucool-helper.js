// ==UserScript==
// @name         Remove 日文能力測驗 for ntu cool
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Remove specific elements in NTU cool
// @author       You
// @match        https://cool.ntu.edu.tw/*
// @grant        none
// @run-at       document-end
// ==/UserScript==
(function () {
    'use strict';

    const TARGET_TEXT = "113-2日文能力測驗（日文一）";
    const SELECTORS = ['div.ic-DashboardCard', '#nav-tray-portal > span > span > div > div > div > div > div > ul > li > ul > li', '#my_courses_table > tbody > tr'];

    function removeMatchingCards(root, selector) {
        const candidates = root.querySelectorAll ? root.querySelectorAll(selector) : [];
        candidates.forEach(el => {
            try {
                if (el && el.innerHTML.includes(TARGET_TEXT)) {
                    el.remove();
                    console.log('Removed element containing target text:', selector, el);
                }
            } catch (e) {
                console.warn('Error checking element', e);
            }
        });
    }

    // 先移除目前已存在的
    SELECTORS.forEach(sel => removeMatchingCards(document, sel));

    // 監聽 DOM 變化
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        SELECTORS.forEach(sel => {
                            if (node.matches && node.matches(sel)) {
                                removeMatchingCards(node.parentNode || document, sel);
                            } else {
                                removeMatchingCards(node, sel);
                            }
                        });
                    }
                });
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
