// ==UserScript==
// @name         HamiVideo Helper
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Replaces play link with product link for #btBack > a
// @author       D101028
// @match        https://hamivideo.hinet.net/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 1. 處理回上一頁連結轉換
     */
    const transformLink = () => {
        const linkElement = document.querySelector('#btBack > a');
        if (!linkElement || !linkElement.href) return;

        const currentHref = window.location.href;
        const match = currentHref.match(/play\/(\={0,1}\d{6})/);

        if (match && match[1]) {
            const videoId = match[1];
            const newHref = `https://hamivideo.hinet.net/hamivideo/product/${videoId}.do?cs=2`;

            // 只有在 href 不同時才更新，避免重複觸發變更
            if (linkElement.getAttribute('href') !== newHref) {
                linkElement.href = newHref;
                linkElement.removeAttribute("onclick");
                console.log('連結已更新為:', newHref);
            }
        }
    };

    /**
     * 2. 移除 Slow 提示框
     */
    const removeSlowDiv = () => {
        const slowDiv = document.getElementById("slow");
        if (slowDiv && slowDiv.style.display !== "none") {
            slowDiv.style.display = "none";
            // 也可以考慮直接移除：slowDiv.remove();
        }
    };

    /**
     * 3. 自動點擊播放按鈕
     */
    const clickAndPlay = () => {
        const cover = document.querySelector("#player > div");
        // 使用 innerText 檢查文字，效能比 innerHTML 好
        if (cover?.innerText.includes("秒後自動播放")) {
            cover.click();
            console.log("已自動觸發播放");
        }
    };

    /**
     * 核心：整合監控函式
     * 將所有需要在頁面變動時執行的動作放在這裡
     */
    const runAllTasks = () => {
        transformLink();
        removeSlowDiv();
        clickAndPlay();
    };

    // --- 執行區 ---

    // 鍵盤監聽事件 (Ctrl + 方向鍵快進/快退 85秒)
    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
            const video = document.querySelector('#h5video');
            if (!video) return;

            const step = 85;
            if (event.key === 'ArrowRight') {
                video.currentTime += step;
            } else {
                video.currentTime -= step;
            }
        }
    });

    // 建立監控器：取代所有的 setInterval
    const observer = new MutationObserver(() => {
        runAllTasks();
    });

    // 開始監控 body 及其子節點變動
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 頁面加載完成後先跑一次
    runAllTasks();
})();