/**
 * Toast — non-blocking notification component.
 */
const Toast = (() => {
  let _container = null;
  let _root = null;

  function _ensureContainer(shadowRoot) {
    if (_root !== shadowRoot) {
      _root = shadowRoot;
      _container = null;
    }
    if (!_container || !_container.isConnected) {
      _container = DOM.create('div', { className: 'acf-toast-container' });
      shadowRoot.appendChild(_container);
    }
    return _container;
  }

  /**
   * Show a toast notification.
   * @param {ShadowRoot} shadowRoot
   * @param {string} message
   * @param {'success'|'error'|'info'} [type='info']
   * @param {number} [duration=3000]
   */
  function show(shadowRoot, message, type = 'info', duration = 3000) {
    const container = _ensureContainer(shadowRoot);

    const toast = DOM.create('div', {
      className: `acf-toast acf-toast--${type}`
    }, [Sanitize.escapeHTML(message)]);

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('acf-toast--leaving');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, duration);
  }

  return { show };
})();
