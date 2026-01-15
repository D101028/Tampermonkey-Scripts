// ==UserScript==
// @name         威秀訂票助手
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  自動重定向、選票、選位跳轉、以及金流頁自動填寫
// @author       D101028
// @match        https://www.vscinemas.com.tw/vsTicketing/ticketing/booking.aspx*
// @match        https://sales.vscinemas.com.tw/VieShowTicketT2/*
// @match        https://ws.vscinemas.com.tw/service_HY/VieShow/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;
    const path = window.location.pathname;
    const host = window.location.hostname;

    // --- 通用工具 ---
    function forceClick(el) {
        if (!el) return;
        el.scrollIntoView({ block: 'center' });
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        el.dispatchEvent(event);
        console.log(`[Action] 已點擊: ${el.id || el.tagName}`);
    }

    function setInputValue(selector, value) {
        const input = document.querySelector(selector);
        if (input) {
            input.value = value;
            // 觸發 input 與 change 事件，確保前端框架（如 ASP.NET 或 Vue/React）偵測到數值
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`[Action] 已填入內容至: ${selector}`);
        }
    }

    // --- 頁面邏輯分配器 ---
    function init() {
        console.log("當前主機:", host, "路徑:", path);

        // 1. 初始重定向 (www.vscinemas.com.tw)
        if (host === 'www.vscinemas.com.tw') {
            handleRedirect();
        }
        // 2. 售票系統頁面 (sales.vscinemas.com.tw)
        else if (host === 'sales.vscinemas.com.tw') {
            if (path.includes('OrderConfirm')) {
                handleOrderConfirm();
            } else if (path.includes('SelectSeats')) {
                handleSelectSeats();
            } else {
                handleTicketSelection();
            }
        }
        // 3. 金流與會員驗證頁面 (ws.vscinemas.com.tw)
        else if (host === 'ws.vscinemas.com.tw') {
            handlePaymentPage();
        }
    }

    // --- 階段 1: 重定向 ---
    function handleRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        const cinemacode = urlParams.get('cinemacode');
        const txtSessionId = urlParams.get('txtSessionId');
        if (cinemacode && txtSessionId) {
            window.location.replace(`https://sales.vscinemas.com.tw/VieShowTicketT2/?agree=on&cinemacode=${cinemacode}&txtSessionId=${txtSessionId}&isEvent=true`);
        }
    }

    // --- 階段 2: 選擇票種 ---
    function handleTicketSelection() {
        const checkPanel = setInterval(() => {
            const panels = Array.from(document.querySelectorAll('#accordion-4 .panel'));
            const targetPanel = panels.find(p => p.textContent.includes("會員票種"));
            if (targetPanel) {
                clearInterval(checkPanel);
                forceClick(targetPanel.querySelector('.panel-heading h4 a'));
                setTimeout(() => {
                    const rows = Array.from(targetPanel.querySelectorAll('tbody tr'));
                    const fullTicketRow = rows.find(r => r.textContent.includes("儲值金會員票"));
                    if (fullTicketRow) {
                        const select = fullTicketRow.querySelector('select');
                        if (select) {
                            select.value = "1";
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            setTimeout(() => forceClick(document.querySelector('#btnDoNext')), 500);
                        }
                    }
                }, 800);
            }
        }, 1000);
    }

    // --- 階段 3 & 4: 選位與確認 ---
    function handleSelectSeats() {
        const checkButton = setInterval(() => {
            const btn = document.querySelector('#btnCheckOut');
            if (btn && btn.offsetParent !== null) {
                forceClick(btn);
                clearInterval(checkButton);
            }
        }, 1000);
    }

    function handleOrderConfirm() {
        const checkButton = setInterval(() => {
            const btn = document.querySelector('#btnCheckoutDeposit');
            if (btn && btn.offsetParent !== null) {
                forceClick(btn);
                clearInterval(checkButton);
            }
        }, 1000);
    }

    // --- 階段 5: 金流頁面自動填寫 (新增) ---
    function handlePaymentPage() {
        console.log("正在執行：金流頁面自動化...");

        const checkElements = setInterval(() => {
            const memberLink = document.querySelector('#ctl00_ContentPlaceHolder1_LabelMemberVEH > a');
            const pinInput = document.querySelector('#ctl00_ContentPlaceHolder1_TextBoxMemberPinNumber');
            const agreeLabel = document.querySelector('#ctl00_ContentPlaceHolder1_PanelPay > div.ui-checkbox > label');

            // 1. 點選會員連結 (如果存在)
            if (memberLink) {
                forceClick(memberLink);
            }

            // 2. 填入 Pin 碼
            if (pinInput && pinInput.value === "") {
                const pin = prompt("Input the pin code:");
                if (pin) 
                    setInputValue('#ctl00_ContentPlaceHolder1_TextBoxMemberPinNumber', pin);
            }

            // 3. 勾選同意協議 (Label)
            if (agreeLabel) {
                forceClick(agreeLabel);
                // 執行完最後一項動作後清除定時器
                console.log("金流頁動作執行完畢");
                clearInterval(checkElements);
            }
        }, 1000);
    }

    init();
})();