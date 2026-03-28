/**
 * Base Adapter — abstract interface that all platform adapters must implement.
 * Provides common utilities and enforces the contract.
 */
class BaseAdapter {
  constructor(platformId, platformName) {
    this.platformId = platformId;
    this.platformName = platformName;
  }

  /**
   * Get the DOM element that contains the conversation list.
   * @returns {Element|null}
   */
  getConversationListContainer() {
    throw new Error('Not implemented: getConversationListContainer');
  }

  /**
   * Parse current visible conversations from the DOM.
   * @returns {Array<{platformId: string, title: string, url: string, element: Element}>}
   */
  getConversationItems() {
    throw new Error('Not implemented: getConversationItems');
  }

  /**
   * Extract the platform's conversation ID from a DOM element.
   * @param {Element} element
   * @returns {string|null}
   */
  extractConversationId(element) {
    throw new Error('Not implemented: extractConversationId');
  }

  /**
   * Extract the conversation title from a DOM element.
   * @param {Element} element
   * @returns {string}
   */
  extractConversationTitle(element) {
    throw new Error('Not implemented: extractConversationTitle');
  }

  /**
   * Construct the full URL for a conversation.
   * @param {string} platformId
   * @returns {string}
   */
  getConversationUrl(platformId) {
    throw new Error('Not implemented: getConversationUrl');
  }

  /**
   * Get the insertion point for the folder panel within the platform's sidebar.
   * Returns the element AFTER which the panel should be inserted, and the parent container.
   * @returns {{ parent: Element, afterElement: Element } | null}
   */
  getInsertionPoint() {
    throw new Error('Not implemented: getInsertionPoint');
  }

  /**
   * Get the platform sidebar container element.
   * @returns {Element|null}
   */
  getSidebarContainer() {
    throw new Error('Not implemented: getSidebarContainer');
  }

  /**
   * Detect the current theme mode of the platform.
   * @returns {'light'|'dark'}
   */
  getThemeMode() {
    // Default heuristic: check common dark mode indicators
    const html = document.documentElement;
    const body = document.body;

    if (html.classList.contains('dark') ||
        html.getAttribute('data-theme') === 'dark' ||
        body.classList.contains('dark') ||
        body.getAttribute('data-theme') === 'dark' ||
        html.getAttribute('data-color-mode') === 'dark') {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Hook into SPA navigation events.
   * @param {Function} callback - called on URL change
   */
  onNavigate(callback) {
    // Default: listen for popstate and intercept pushState/replaceState
    let lastUrl = location.href;

    const checkUrl = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        callback(lastUrl);
      }
    };

    // Monitor popstate
    window.addEventListener('popstate', checkUrl);

    // Intercept pushState/replaceState
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;

    history.pushState = function (...args) {
      origPushState.apply(this, args);
      checkUrl();
    };

    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      checkUrl();
    };

    // Also poll as fallback for frameworks that modify URL without history API
    setInterval(checkUrl, 1000);
  }

  /**
   * Get CSS selector for the conversation list container (for MutationObserver).
   * @returns {string}
   */
  getConversationListSelector() {
    throw new Error('Not implemented: getConversationListSelector');
  }

  /**
   * Try multiple selectors and return the first match.
   * @param {string[]} selectors
   * @param {Element|Document} root
   * @returns {Element|null}
   */
  _trySelectors(selectors, root = document) {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return null;
  }

  /**
   * Try multiple selectors and return all matches from the first successful one.
   * @param {string[]} selectors
   * @param {Element|Document} root
   * @returns {Element[]}
   */
  _trySelectorsAll(selectors, root = document) {
    for (const sel of selectors) {
      try {
        const els = root.querySelectorAll(sel);
        if (els.length > 0) return Array.from(els);
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return [];
  }
}
