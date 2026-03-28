/**
 * Modal — reusable modal dialog component.
 */
const Modal = (() => {
  /**
   * Show a confirmation dialog.
   * @param {ShadowRoot} shadowRoot
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmText='确定']
   * @param {string} [options.cancelText='取消']
   * @param {boolean} [options.danger=false]
   * @returns {Promise<boolean>}
   */
  function confirm(shadowRoot, { title, message, confirmText = '确定', cancelText = '取消', danger = false }) {
    return new Promise((resolve) => {
      // Create overlay that will be appended to body (not shadow root) for proper positioning
      const overlay = document.createElement('div');
      overlay.className = 'acf-modal-overlay acf-modal-external';
      overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2147483647 !important;
        background: rgba(0, 0, 0, 0.5) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      `;

      const modal = document.createElement('div');
      modal.className = 'acf-modal';
      modal.style.cssText = `
        background: #fff !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        min-width: 320px !important;
        max-width: 90vw !important;
        padding: 20px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      `;

      const header = document.createElement('div');
      header.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1a1a2e;';
      header.textContent = title;

      const body = document.createElement('div');
      body.style.cssText = 'font-size: 14px; color: #666; margin-bottom: 20px;';
      body.textContent = message;

      const footer = document.createElement('div');
      footer.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = cancelText;
      cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px;';
      cancelBtn.onclick = () => close(false);

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = confirmText;
      confirmBtn.style.cssText = `padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; color: #fff; background: ${danger ? '#ef4444' : '#4a90d9'};`;
      confirmBtn.onclick = () => close(true);

      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);
      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      // Prevent clicks from propagating
      overlay.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target === overlay) close(false);
      });

      // ESC key to close
      const keyHandler = (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', keyHandler, true);
          close(false);
        }
      };
      document.addEventListener('keydown', keyHandler, true);

      document.body.appendChild(overlay);
      confirmBtn.focus();
    });
  }

  /**
   * Show a prompt dialog with an input field.
   * @param {ShadowRoot} shadowRoot
   * @param {Object} options
   * @param {string} options.title
   * @param {string} [options.defaultValue='']
   * @param {string} [options.placeholder='']
   * @param {string} [options.confirmText='确定']
   * @param {string} [options.cancelText='取消']
   * @returns {Promise<string|null>}
   */
  function prompt(shadowRoot, { title, defaultValue = '', placeholder = '', confirmText = '确定', cancelText = '取消' }) {
    return new Promise((resolve) => {
      // Create overlay in body for proper centering
      const overlay = document.createElement('div');
      overlay.className = 'acf-modal-overlay acf-modal-external';
      overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2147483647 !important;
        background: rgba(0, 0, 0, 0.5) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      `;

      const modal = document.createElement('div');
      modal.className = 'acf-modal';
      modal.style.cssText = `
        background: #fff !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        min-width: 320px !important;
        max-width: 90vw !important;
        padding: 20px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      `;

      const header = document.createElement('div');
      header.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1a1a2e;';
      header.textContent = title;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue;
      input.placeholder = placeholder;
      input.style.cssText = `
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
        margin-bottom: 20px;
      `;
      input.addEventListener('focus', () => {
        input.style.borderColor = '#4a90d9';
        input.style.boxShadow = '0 0 0 2px rgba(74, 144, 217, 0.2)';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = '#ddd';
        input.style.boxShadow = 'none';
      });

      const footer = document.createElement('div');
      footer.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = cancelText;
      cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px;';
      cancelBtn.onclick = () => close(null);

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = confirmText;
      confirmBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; color: #fff; background: #4a90d9;';
      confirmBtn.onclick = () => close(input.value.trim());

      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);
      modal.appendChild(header);
      modal.appendChild(input);
      modal.appendChild(footer);
      overlay.appendChild(modal);

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      // Prevent events from propagating to the page
      const stopPropagation = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      // Block all input events from reaching the page
      ['input', 'keydown', 'keyup', 'keypress', 'compositionstart', 'compositionend'].forEach(event => {
        input.addEventListener(event, stopPropagation, true);
      });

      // Handle Enter and Escape
      input.addEventListener('keydown', (e) => {
        stopPropagation(e);
        if (e.key === 'Enter') {
          close(input.value.trim());
        }
        if (e.key === 'Escape') {
          close(null);
        }
      });

      // Click outside to close
      overlay.addEventListener('click', (e) => {
        stopPropagation(e);
        if (e.target === overlay) close(null);
      });

      // ESC key to close (capture phase)
      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          stopPropagation(e);
          document.removeEventListener('keydown', keyHandler, true);
          close(null);
        }
      };
      document.addEventListener('keydown', keyHandler, true);

      document.body.appendChild(overlay);
      
      // Focus input after a small delay to ensure it's in DOM
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    });
  }

  return { confirm, prompt };
})();
