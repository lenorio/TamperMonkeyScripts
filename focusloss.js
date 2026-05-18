// ==UserScript==
// @name         AntiFocusLoss
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Абсолютная защита с проверкой relatedTarget + Детектор
// @author       lenorio
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const injectCode = `
        let hasNotified = false;

        function showDetectorNotification(triggerType) {
            if (hasNotified) return;
            hasNotified = true;

            const renderAlert = () => {
                if (!document.body) {
                    setTimeout(renderAlert, 50);
                    return;
                }

                const toast = document.createElement('div');
                toast.innerHTML = '<strong style="display:block;margin-bottom:4px;font-size:14px;letter-spacing:0.5px;">FOCUS PROTECTED</strong>Сайт пытался отследить: <code style="background:#222;padding:2px 4px;border-radius:3px;">' + triggerType + '</code>';

                Object.assign(toast.style, {
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    background: '#0a0a0a',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    borderLeft: '4px solid #ffffff',
                    padding: '16px 20px',
                    fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    zIndex: '2147483647',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    borderRadius: '4px',
                    opacity: '0',
                    transform: 'translateX(50px)',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    pointerEvents: 'none'
                });

                document.body.appendChild(toast);

                requestAnimationFrame(() => {
                    toast.style.opacity = '1';
                    toast.style.transform = 'translateX(0)';
                });

                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(50px)';
                    setTimeout(() => toast.remove(), 300);
                }, 5000);
            };

            renderAlert();
        }

        Object.defineProperty(document, 'hidden', { get: () => { showDetectorNotification('document.hidden'); return false; }, configurable: true });
        Object.defineProperty(document, 'visibilityState', { get: () => { showDetectorNotification('visibilityState'); return 'visible'; }, configurable: true });
        Object.defineProperty(document, 'webkitHidden', { get: () => false, configurable: true });
        Object.defineProperty(document, 'mozHidden', { get: () => false, configurable: true });

        Document.prototype.hasFocus = function() { return true; };
        Window.prototype.hasFocus = function() { return true; };

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

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (eventsToBlock.includes(type)) {
                showDetectorNotification(type);
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

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
