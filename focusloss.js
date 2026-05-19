// ==UserScript==
// @name         AntiFocusLoss
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Абсолютная защита + Детектор (Компактный вид, автоскрытие 5 сек)
// @author       lenorio
// @match        *://*/*
// @exclude      *://*.hcaptcha.com/*
// @exclude      *://hcaptcha.com/*
// @exclude      *://*.recaptcha.net/*
// @exclude      *://www.google.com/recaptcha/*
// @exclude      *://challenges.cloudflare.com/*
// @exclude      *://turnstile.cloudflare.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const injectCode = `
        let hasNotified = false;
        let styleInjected = false;

        function showDetectorNotification(triggerType) {
            if (hasNotified) return;
            hasNotified = true;

            const renderAlert = () => {
                if (!document.body || !document.head) {
                    setTimeout(renderAlert, 50);
                    return;
                }

                if (!styleInjected) {
                    const style = document.createElement('style');
                    style.textContent = \`
                        #afl-toast {
                            position: fixed;
                            top: 24px;
                            right: 24px;
                            width: 48px;
                            height: 48px;
                            background: #0a0a0a;
                            color: #ffffff;
                            border: 1px solid #333333;
                            border-radius: 24px;
                            display: flex;
                            align-items: center;
                            font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
                            font-size: 13px;
                            line-height: 1.4;
                            z-index: 2147483647;
                            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                            opacity: 0;
                            transform: translateX(50px);
                            transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
                            overflow: hidden;
                            cursor: default;
                        }
                        #afl-toast:hover {
                            width: 290px;
                            border-radius: 8px;
                            border-left: 4px solid #ffffff;
                            background: #111111;
                        }
                        .afl-icon {
                            min-width: 48px;
                            height: 48px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                        }
                        .afl-content {
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            opacity: 0;
                            white-space: nowrap;
                            transition: opacity 0.2s ease;
                        }
                        #afl-toast:hover .afl-content {
                            opacity: 1;
                            transition-delay: 0.15s;
                        }
                        .afl-title {
                            font-weight: bold;
                            margin-bottom: 2px;
                            font-size: 14px;
                            letter-spacing: 0.5px;
                        }
                        .afl-code {
                            background: #222;
                            padding: 2px 4px;
                            border-radius: 3px;
                            font-size: 12px;
                            color: #ffcc00;
                        }
                    \`;
                    document.head.appendChild(style);
                    styleInjected = true;
                }

                const toast = document.createElement('div');
                toast.id = 'afl-toast';
                toast.innerHTML = \`
                    <div class="afl-icon">👁️</div>
                    <div class="afl-content">
                        <span class="afl-title">FOCUS PROTECTED</span>
                        <span>Блок: <code class="afl-code">\${triggerType}</code></span>
                    </div>
                \`;

                document.body.appendChild(toast);

                // Анимация появления
                requestAnimationFrame(() => {
                    toast.style.opacity = '1';
                    toast.style.transform = 'translateX(0)';
                });

                // Строгое удаление через 5 секунд
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateX(50px)';
                        setTimeout(() => toast.remove(), 400); // ждем завершения анимации исчезновения
                    }
                }, 5000);
            };

            renderAlert();
        }

        // 1. Замораживаем свойства видимости (Page Visibility API)
        Object.defineProperty(document, 'hidden', { get: () => { showDetectorNotification('document.hidden'); return false; }, configurable: true });
        Object.defineProperty(document, 'visibilityState', { get: () => { showDetectorNotification('visibilityState'); return 'visible'; }, configurable: true });
        Object.defineProperty(document, 'webkitHidden', { get: () => false, configurable: true });
        Object.defineProperty(document, 'mozHidden', { get: () => false, configurable: true });

        Document.prototype.hasFocus = function() { return true; };
        Window.prototype.hasFocus = function() { return true; };

        // 2. Умный перехват событий с анализом вектора фокуса
        const eventsToBlock = [
            'visibilitychange', 'webkitvisibilitychange', 'mozvisibilitychange',
            'blur', 'focus', 'focusout', 'focusin', 'mouseleave', 'pagehide'
        ];

        const blockEvent = function(e) {
            if (['visibilitychange', 'webkitvisibilitychange', 'mozvisibilitychange', 'pagehide', 'mouseleave'].includes(e.type)) {
                e.stopImmediatePropagation();
                e.stopPropagation();
                return;
            }

            if (['blur', 'focus', 'focusout', 'focusin'].includes(e.type)) {
                if (e.relatedTarget === null || e.target === window || e.target === document) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                }
            }
        };

        const originalAddEventListener = EventTarget.prototype.addEventListener;

        eventsToBlock.forEach(eventName => {
            originalAddEventListener.call(window, eventName, blockEvent, true);
            originalAddEventListener.call(document, eventName, blockEvent, true);
        });

        // 3. Перехватчик: ловим попытки сайта повесить свои слушатели
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (eventsToBlock.includes(type)) {
                showDetectorNotification(type);
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // 4. Глушим on-свойства
        const noop = function() {};
        const getNull = function() { return null; };

        ['onblur', 'onfocus', 'onfocusin', 'onfocusout', 'onvisibilitychange', 'onmouseleave'].forEach(prop => {
            Object.defineProperty(window, prop, { set: (val) => { if(val) showDetectorNotification(prop); }, get: getNull, configurable: true });
            Object.defineProperty(document, prop, { set: (val) => { if(val) showDetectorNotification(prop); }, get: getNull, configurable: true });
        });
    `;

    const script = document.createElement('script');
    script.textContent = injectCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
})();
