/**
 * Injector — injects the folder panel into the platform's own sidebar using Shadow DOM.
 * The panel is embedded inline (below "New Chat" button), not as a separate fixed panel.
 */
const Injector = (() => {
  let _host = null;
  let _shadowRoot = null;
  let _adapter = null;
  let _retryTimer = null;
  let _mutationObserver = null;
  let _resolveInject = null;
  let _injected = false;

  /**
   * Inject the folder panel into the platform's sidebar.
   * @param {BaseAdapter} adapter
   * @param {Object} settings
   * @returns {Promise<ShadowRoot|null>}
   */
  async function inject(adapter, settings) {
    if (_host && _host.isConnected) return _shadowRoot;
    if (_injected) return _shadowRoot;

    _adapter = adapter;
    console.log('[汇聊] Starting injection...');

    // Try multiple times immediately for fast detection
    for (let i = 0; i < 20; i++) {
      if (_tryInsert(settings)) {
        console.log('[汇聊] Injection successful on attempt', i + 1);
        return _shadowRoot;
      }
      // Wait a tiny bit before retrying
      await new Promise(r => setTimeout(r, 50));
    }

    console.log('[汇聊] Immediate injection failed, starting continuous detection...');

    // Start MutationObserver for faster detection
    return new Promise((resolve) => {
      _resolveInject = resolve;
      
      // Start MutationObserver
      _startMutationObserver(settings);

      // Fallback polling
      let attempts = 0;
      const maxAttempts = 200; // 200 * 50ms = 10 seconds max
      const interval = 50; // Very fast polling
      
      _retryTimer = setInterval(() => {
        attempts++;
        if (_tryInsert(settings)) {
          console.log('[汇聊] Injection successful after', attempts, 'polling attempts');
          _cleanup();
          resolve(_shadowRoot);
        } else if (attempts > maxAttempts) {
          console.warn('[汇聊] Could not find sidebar insertion point, using fallback.');
          _cleanup();
          _injectFallback(settings);
          resolve(_shadowRoot);
        }
      }, interval);
    });
  }

  function _cleanup() {
    _stopMutationObserver();
    if (_retryTimer) {
      clearInterval(_retryTimer);
      _retryTimer = null;
    }
    _resolveInject = null;
  }

  /**
   * Start MutationObserver to detect sidebar faster.
   */
  function _startMutationObserver(settings) {
    if (_mutationObserver) return;
    
    const checkAndInject = () => {
      if (_injected) return;
      if (_tryInsert(settings)) {
        console.log('[汇聊] MutationObserver triggered injection');
        _cleanup();
        if (_resolveInject) {
          _resolveInject(_shadowRoot);
        }
      }
    };
    
    _mutationObserver = new MutationObserver(checkAndInject);
    
    _mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-history-container']
    });
    
    console.log('[汇聊] MutationObserver started');
  }

  /**
   * Stop MutationObserver.
   */
  function _stopMutationObserver() {
    if (_mutationObserver) {
      _mutationObserver.disconnect();
      _mutationObserver = null;
    }
  }

  /**
   * Attempt to insert the panel into the platform sidebar.
   * @param {Object} settings
   * @returns {boolean}
   */
  function _tryInsert(settings) {
    const insertionPoint = _adapter.getInsertionPoint();
    if (!insertionPoint || !insertionPoint.parent) {
      return false;
    }
  
    // Check if already injected
    if (document.getElementById('acf-sidebar-host')) {
      _injected = true;
      return true;
    }
  
    _host = document.createElement('div');
    _host.id = 'acf-sidebar-host';
    _host.style.cssText = 'all: initial; display: block; width: 100%; font-size: 13px;';
  
    _shadowRoot = _host.attachShadow({ mode: 'open' });
    _injectStyles(_shadowRoot);
  
    const { parent, afterElement } = insertionPoint;
    if (afterElement && afterElement.parentElement === parent) {
      afterElement.insertAdjacentElement('afterend', _host);
    } else {
      parent.insertBefore(_host, parent.firstChild);
    }
  
    const theme = settings.theme === 'auto' ? _adapter.getThemeMode() : settings.theme;
    _host.setAttribute('data-acf-theme', theme);
    
    _injected = true;
    console.log('[汇聊] Panel injected into platform sidebar.');
    return true;
  }

  /**
   * Fallback: inject as a fixed panel if sidebar insertion fails.
   * @param {Object} settings
   */
  function _injectFallback(settings) {
    _host = document.createElement('div');
    _host.id = 'acf-sidebar-host';
    _host.style.cssText = 'all: initial; position: fixed; top: 0; right: 0; z-index: 99990; height: 100vh;';

    _shadowRoot = _host.attachShadow({ mode: 'open' });
    _injectStyles(_shadowRoot);
    document.body.appendChild(_host);

    const theme = settings.theme === 'auto' ? _adapter.getThemeMode() : settings.theme;
    _host.setAttribute('data-acf-theme', theme);
  }

  /**
   * Inject CSS into the Shadow DOM via <link> elements (reliable, no fetch needed).
   * @param {ShadowRoot} shadowRoot
   */
  function _injectStyles(shadowRoot) {
    const cssFiles = [
      'src/ui/themes/variables.css',
      'src/ui/themes/light.css',
      'src/ui/themes/dark.css',
      'src/ui/sidebar/sidebar.css'
    ];

    for (const file of cssFiles) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = browserAPI.runtime.getURL(file);
      shadowRoot.appendChild(link);
    }
  }

  /**
   * Update the theme attribute on the host element.
   * @param {'light'|'dark'} theme
   */
  function setTheme(theme) {
    if (_host) {
      _host.setAttribute('data-acf-theme', theme);
    }
  }

  /**
   * Check if the host is still in the DOM and re-inject if removed (SPA re-render).
   * @param {Object} settings
   * @returns {boolean} true if panel is alive
   */
  function ensureAlive(settings) {
    if (_host && _host.isConnected) return true;
    _host = null;
    _shadowRoot = null;
    return false;
  }

  /**
   * Remove the sidebar from the page.
   */
  function remove() {
    _stopMutationObserver();
    if (_retryTimer) {
      clearInterval(_retryTimer);
      _retryTimer = null;
    }
    if (_host && _host.parentNode) {
      _host.parentNode.removeChild(_host);
    }
    _host = null;
    _shadowRoot = null;
    _adapter = null;
  }

  function getShadowRoot() {
    return _shadowRoot;
  }

  function isInjected() {
    return _host !== null && _host.isConnected;
  }

  return { inject, setTheme, ensureAlive, remove, getShadowRoot, isInjected };
})();
