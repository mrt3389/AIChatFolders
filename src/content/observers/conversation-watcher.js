/**
 * Conversation Watcher — uses MutationObserver to detect conversation list changes.
 */
const ConversationWatcher = (() => {
  let _observer = null;
  let _adapter = null;
  let _callback = null;
  let _lastScan = [];
  let _retryTimer = null;
  let _scanDebounced = null;

  /**
   * Start watching for conversation list changes.
   * @param {BaseAdapter} adapter
   * @param {Function} callback - called with array of conversations when changes detected
   */
  function start(adapter, callback) {
    _adapter = adapter;
    _callback = callback;
    _scanDebounced = debounce(_doScan, 500);

    // Initial scan
    _doScan();

    // Set up MutationObserver
    _observeContainer();

    // Retry finding the container if not found initially
    if (!_observer) {
      _retryTimer = setInterval(() => {
        if (_observeContainer()) {
          clearInterval(_retryTimer);
          _retryTimer = null;
        }
      }, 2000);
    }
  }

  /**
   * Stop watching.
   */
  function stop() {
    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }
    if (_retryTimer) {
      clearInterval(_retryTimer);
      _retryTimer = null;
    }
    _adapter = null;
    _callback = null;
    _lastScan = [];
  }

  /**
   * Force a re-scan of conversations.
   */
  function rescan() {
    _doScan();
  }

  /**
   * Try to attach MutationObserver to the conversation list container.
   * @returns {boolean} true if observer attached
   */
  function _observeContainer() {
    if (!_adapter) return false;

    const container = _adapter.getConversationListContainer();
    if (!container) {
      // Fallback: observe body for when the sidebar appears
      _observeBody();
      return false;
    }

    if (_observer) _observer.disconnect();

    _observer = new MutationObserver((mutations) => {
      // Check if mutations are relevant (not just style/attribute changes in our sidebar)
      const relevant = mutations.some(m => {
        const target = m.target;
        // Skip mutations inside our own sidebar
        if (target.id === 'acf-sidebar-host' || target.closest?.('#acf-sidebar-host')) {
          return false;
        }
        return m.type === 'childList' || m.type === 'characterData';
      });

      if (relevant && _scanDebounced) {
        _scanDebounced();
      }
    });

    _observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return true;
  }

  /**
   * Observe body until the sidebar container appears.
   */
  function _observeBody() {
    if (_observer) _observer.disconnect();

    _observer = new MutationObserver(() => {
      if (_adapter && _adapter.getConversationListContainer()) {
        _observer.disconnect();
        _observeContainer();
        _doScan();
      }
    });

    _observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Perform a scan and notify if changes detected.
   */
  function _doScan() {
    if (!_adapter || !_callback) return;

    try {
      const current = _adapter.getConversationItems();
      if (_hasChanges(current)) {
        _lastScan = current;
        _callback(current);
      }
    } catch (e) {
      console.warn('[汇聊] Scan error:', e);
    }
  }

  /**
   * Check if the scan results differ from the last scan.
   * @param {Array} current
   * @returns {boolean}
   */
  function _hasChanges(current) {
    if (current.length !== _lastScan.length) return true;
    for (let i = 0; i < current.length; i++) {
      if (current[i].platformId !== _lastScan[i]?.platformId ||
          current[i].title !== _lastScan[i]?.title) {
        return true;
      }
    }
    return false;
  }

  return { start, stop, rescan };
})();
