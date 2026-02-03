// ==UserScript==
// @name         Test
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  包含票種選取、數量、PIN 碼儲存功能
// @author       Gemini
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 樣式設定 (CSS) ---
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
            width: 220px;
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

    // --- 2. HTML 結構 ---
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
                    <div id="other-block">
                        <span title="預設為\`一般票種 全票\`" class="tm-help">❓</span>
                        <input type="text" id="tm-other-type-input" class="tm-input" placeholder="請輸入票種 e.g. \`優惠套票 優惠單人套票\`">
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

    // --- 3. 邏輯控制 ---
    const container = document.getElementById('tm-menu-container');
    const content = document.getElementById('tm-menu-content');
    const header = document.getElementById('tm-menu-header');
    const toggleIcon = document.getElementById('tm-toggle-icon');
    const typeSelect = document.getElementById('tm-ticket-type');
    const otherInput = document.getElementById('tm-other-type-input');
    const otherBlock = document.getElementById('other-block');
    const seatsInput = document.getElementById('tm-seats-input');
    const qtySelect = document.getElementById('tm-ticket-qty');
    const pinInput = document.getElementById('tm-pin-code');
    const saveBtn = document.getElementById('tm-save-btn');
    const resetBtn = document.getElementById('tm-reset-btn');

    // 初始化：讀取舊有設定
    const savedConfig = GM_getValue('bookingConfig', { type: '一般票種 全票', otherType: '', seats: '', qty: '1', pin: '' });
    typeSelect.value = (savedConfig.type === '其他' || !['會員票種 儲值金會員票', '一般票種 全票', '一般票種 優待票'].includes(savedConfig.type)) ? '其他' : savedConfig.type;
    if (typeSelect.value === 'other') {
        otherInput.style.display = 'block';
        otherInput.value = savedConfig.otherType || savedConfig.type;
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
            otherInput.value = '';
            otherBlock.style.display = 'none';
            seatsInput.value = '';
            qtySelect.value = '1';
            pinInput.value = '';
            GM_setValue('bookingConfig', { type: '一般票種 全票', otherType: '', seats: '', qty: '1', pin: '' });
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

})();