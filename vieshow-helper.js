// ==UserScript==
// @name         威秀訂票助手
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  自動重定向、選票、選位跳轉、以及金流頁自動填寫
// @author       D101028
// @match        https://www.vscinemas.com.tw/vsTicketing/ticketing/booking.aspx*
// @match        https://sales.vscinemas.com.tw/VieShowTicketT2/*
// @match        https://ws.vscinemas.com.tw/service_HY/VieShow/*
// @match        https://vscinemas.com.tw/*
// @match        https://*.vscinemas.com.tw/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    // --- 助手介面 ---
    const defaultConfig = { type: '一般票種 全票', otherType: '', seats: '', qty: '1', pin: '' }; 
    function createDashboard() {
        // 樣式設定 (CSS)
        GM_addStyle(`
            #tm-menu-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                background: #ffffff;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                font-family: sans-serif;
                width: 280px;
                overflow: hidden;
            }
            #tm-menu-header {
                background: #007bff;
                color: white;
                padding: 10px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: bold;
                cursor: move; /* 提示可拖曳 */
                user-select: none; /* 防止拖曳時選取到文字 */
            }
            #tm-toggle-icon {
                cursor: pointer;
                user-select: none;
            }
            #tm-menu-content {
                padding: 15px;
                display: block; /* 預設展開 */
            }
            .tm-section { margin-bottom: 15px; }
            .tm-label { display: block; font-size: 12px; color: #666; margin-bottom: 5px; }
            .tm-input, .tm-select {
                width: 100%;
                padding: 6px;
                box-sizing: border-box;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 8px;
            }
            #tm-other-type-input { display: none; } /* 預設隱藏其他輸入框 */
            .tm-btn-group { display: flex; gap: 10px; }
            .tm-btn {
                flex: 1;
                padding: 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            #tm-save-btn { background: #28a745; color: white; }
            #tm-reset-btn { background: #dc3545; color: white; }
            .tm-btn:hover { opacity: 0.9; }
            .tm-help { color: #111; cursor: help; }
        `);

        // HTML 結構
        const menuHtml = `
            <div id="tm-menu-container">
                <div id="tm-menu-header">
                    <span>🎫 訂票設定</span>
                    <span id="tm-toggle-icon">➖</span>
                </div>
                <div id="tm-menu-content">
                    <div class="tm-section">
                        <label class="tm-label">訂票內容</label>
                        <select id="tm-ticket-type" class="tm-select">
                            <option value="會員票種 儲值金會員票">會員票種 儲值金會員票</option>
                            <option value="一般票種 全票">一般票種 全票</option>
                            <option value="一般票種 優待票">一般票種 優待票</option>
                            <option value="other">其他</option>
                        </select>
                        <div id="tm-other-block">
                            <span title="預設為\`一般票種 全票\`" class="tm-help">❓</span>
                            <input type="text" id="tm-other-type-input" class="tm-input" placeholder="請輸入票種 e.g. \`優惠套票 優惠單人套票\`" style="display: block;">
                        </div>

                        <select id="tm-ticket-qty" class="tm-select">
                            <option value="1">1 張</option>
                            <option value="2">2 張</option>
                            <option value="3">3 張</option>
                            <option value="4">4 張</option>
                        </select>
                        <span title="留白或不可選改以自動選位" class="tm-help">❓</span>
                        <input type="text" id="tm-seats-input" class="tm-input" placeholder="請輸入偏好選位 e.g. \`F9 G9\`">
                    </div>

                    <div class="tm-section">
                        <label class="tm-label">安全驗證 (PIN)</label>
                        <input type="password" id="tm-pin-code" class="tm-input" placeholder="輸入 PIN 碼">
                    </div>

                    <div class="tm-btn-group">
                        <button id="tm-reset-btn" class="tm-btn">重設</button>
                        <button id="tm-save-btn" class="tm-btn">儲存</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', menuHtml);

        // 邏輯控制
        const container = document.getElementById('tm-menu-container');
        const content = document.getElementById('tm-menu-content');
        const header = document.getElementById('tm-menu-header');
        const toggleIcon = document.getElementById('tm-toggle-icon');
        const typeSelect = document.getElementById('tm-ticket-type');
        const otherInput = document.getElementById('tm-other-type-input');
        const otherBlock = document.getElementById('tm-other-block');
        const seatsInput = document.getElementById('tm-seats-input');
        const qtySelect = document.getElementById('tm-ticket-qty');
        const pinInput = document.getElementById('tm-pin-code');
        const saveBtn = document.getElementById('tm-save-btn');
        const resetBtn = document.getElementById('tm-reset-btn');

        // 初始化：讀取舊有設定
        const savedConfig = GM_getValue('bookingConfig', defaultConfig);
        typeSelect.value = (savedConfig.type === 'other' || !['會員票種 儲值金會員票', '一般票種 全票', '一般票種 優待票'].includes(savedConfig.type)) ? 'other' : savedConfig.type;
        if (typeSelect.value === 'other') {
            otherBlock.style.display = 'block';
            otherInput.value = savedConfig.otherType || savedConfig.type;
        } else {
            otherBlock.style.display = 'none';
        }
        seatsInput.value = savedConfig.seats;
        qtySelect.value = savedConfig.qty;
        pinInput.value = savedConfig.pin;

        // 折疊功能
        toggleIcon.addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            toggleIcon.innerText = isHidden ? '➖' : '➕';
        });

        // 「其他」選項聯動邏輯
        typeSelect.addEventListener('change', () => {
            otherBlock.style.display = typeSelect.value === 'other' ? 'block' : 'none';
        });

        // 儲存功能
        saveBtn.addEventListener('click', () => {
            const config = {
                type: typeSelect.value,
                otherType: otherInput.value,
                seats: seatsInput.value,
                qty: qtySelect.value,
                pin: pinInput.value
            };
            GM_setValue('bookingConfig', config);
            alert('設定已儲存！');
        });

        // 重設功能
        resetBtn.addEventListener('click', () => {
            if(confirm('確定要清空所有設定嗎？')) {
                typeSelect.value = '一般票種 全票';
                otherInput.value = defaultConfig.otherType;
                otherBlock.style.display = 'none';
                seatsInput.value = defaultConfig.seats;
                qtySelect.value = defaultConfig.qty;
                pinInput.value = defaultConfig.pin;
                GM_setValue('bookingConfig', defaultConfig);
            }
        });

        // --- 拖曳功能實作 ---
        let isDragging = false;
        let offsetX, offsetY;

        // 從儲存的設定讀取位置，如果沒有則用預設值
        const savedPos = GM_getValue('menuPos', { top: '20px', left: 'auto', right: '20px' });
        container.style.top = savedPos.top;
        container.style.left = savedPos.left;
        container.style.right = savedPos.right;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;

            // 計算滑鼠點擊位置與選單左上角的偏移量
            const rect = container.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            header.style.background = '#0056b3'; // 拖曳時變色提示
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // 計算新位置
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // 套用位置 (使用 fixed 定位)
            container.style.left = newX + 'px';
            container.style.top = newY + 'px';
            container.style.right = 'auto'; // 清除原本的 right 設定，否則會衝突
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.background = '#007bff';

                // 儲存位置到腳本存儲中
                GM_setValue('menuPos', {
                    top: container.style.top,
                    left: container.style.left,
                    right: 'auto'
                });
            }
        });
    }

    // --- URL related ---
    const currentUrl = window.location.href;
    const path = window.location.pathname;
    const host = window.location.hostname;

    // --- 通用工具 ---
    // function forceClick(el) {
    //     if (!el) return;
    //     el.scrollIntoView({ block: 'center' });
    //     const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    //     el.dispatchEvent(event);
    //     console.log(`[Action] 已點擊: ${el.id || el.tagName}`);
    // }

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

        // 顯示助手
        createDashboard();

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
        const savedConfig = GM_getValue('bookingConfig', defaultConfig);
        const ticketType = savedConfig.type === 'other' ? savedConfig.otherType : savedConfig.type;
        const ticketQty = savedConfig.qty;
        let fatherType = '';
        let mainType = '';

        // 解析 ticketType
        if (ticketType) {
            const parts = ticketType.split(' ');
            if (parts.length >= 2) {
                fatherType = parts[0]; // 例如 "一般票種"
                mainType = parts.slice(1).join(' '); // 例如 "全票"
            } else {
                // 如果格式不符合預期，給予預設值或錯誤處理
                fatherType = '一般票種';
                mainType = '全票';
            }
        }

        console.log(`解析票種：(${fatherType}, ${mainType})`);

        const checkPanel = setInterval(() => {
            const panels = Array.from(document.querySelectorAll('#accordion-4 .panel'));
            const targetPanel = panels.find(p => p.textContent.includes(fatherType));
            if (targetPanel) {
                clearInterval(checkPanel);
                // targetPanel.querySelector('.panel-heading h4 a').click();
                setTimeout(() => {
                    const rows = Array.from(targetPanel.querySelectorAll('tbody tr'));
                    const fullTicketRow = rows.find(r => r.textContent.includes(mainType));
                    if (fullTicketRow) {
                        const select = fullTicketRow.querySelector('select');
                        if (select) {
                            select.value = ticketQty;
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            setTimeout(() => document.querySelector('#btnDoNext').click(), 500);
                        }
                    }
                }, 100);
            }
        }, 200);
    }

    // --- 階段 3 & 4: 選位與確認 ---
    function handleSelectSeats() {
        const savedConfig = GM_getValue('bookingConfig', defaultConfig);
        const ticketSeats = savedConfig.seats;
        
        let preferredSeats = [];
        if (ticketSeats) {
            preferredSeats = ticketSeats.toUpperCase().split(' ').map(s => {
                const match = s.match(/([A-Z]+)(\d+)/);
                return match ? `${match[1]}-${parseInt(match[2], 10)}` : null;
            }).filter(s => s !== null);
        }

        const selectSeats = () => {
            if (preferredSeats.length === 0) {
                console.log("未設定偏好座位，將自動選位。");
                return;
            }

            let selectedCount = 0;
            const qty = parseInt(savedConfig.qty, 10); 
            for (const seatCode of preferredSeats) {
                const seatElement = document.querySelector(`#${seatCode}`);
                if (seatElement && seatElement.getAttribute("data-status") === "0") {
                    seatElement.click();
                    console.log(`選位：${seatCode}`);
                    selectedCount++;
                } else if (seatElement && seatElement.getAttribute("data-status") === "5") {
                    selectedCount++; // 已經被選中
                }
                if (selectedCount >= qty) {
                    break;
                }
            }
        };

        // 等待座位圖加載完成
        const checkSeatsInterval = setInterval(() => {
            const seatMap = document.querySelector('#select-seats-container');
            if (seatMap) {
                clearInterval(checkSeatsInterval);
                selectSeats();
            }
        }, 100);
        
        const checkButton = setInterval(() => {
            const btn = document.querySelector('#btnCheckOut');
            if (btn && btn.offsetParent !== null) {
                btn.click();
                clearInterval(checkButton);
            }
        }, 100);
    }

    function handleOrderConfirm() {
        const checkButton = setInterval(() => {
            const btn = document.querySelector('#btnCheckoutDeposit');
            if (btn && btn.offsetParent !== null) {
                btn.click();
                clearInterval(checkButton);
            }
        }, 100);
    }

    // --- 階段 5: 金流頁面自動填寫 (新增) ---
    function handlePaymentPage() {
        console.log("正在執行：金流頁面自動化...");

        const savedConfig = GM_getValue('bookingConfig', defaultConfig);

        const ticketPin = savedConfig.pin;

        const checkElements = setInterval(() => {
            const memberLink = document.querySelector('#ctl00_ContentPlaceHolder1_LabelMemberVEH > a');
            const pinInput = document.querySelector('#ctl00_ContentPlaceHolder1_TextBoxMemberPinNumber');
            const agreeLabel = document.querySelector('#ctl00_ContentPlaceHolder1_PanelPay > div.ui-checkbox > label');

            // 1. 點選會員連結 (如果存在)
            if (memberLink) {
                memberLink.click();
            }

            // 2. 填入 Pin 碼
            if (pinInput && pinInput.value === "") {
                setInputValue('#ctl00_ContentPlaceHolder1_TextBoxMemberPinNumber', ticketPin);
            }

            // 3. 勾選同意協議 (Label)
            if (agreeLabel) {
                agreeLabel.click();
                // 執行完最後一項動作後清除定時器
                console.log("金流頁動作執行完畢");
                clearInterval(checkElements);
            }
        }, 100);
    }

    init();
})();