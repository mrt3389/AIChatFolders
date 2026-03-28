/**
 * Theme Detector — detects and monitors the platform's theme mode.
 */
const ThemeDetector = (() => {
  let _observer = null;
  let _currentTheme = 'light';
  let _callback = null;

  /**
   * Start detecting and monitoring theme changes.
   * @param {BaseAdapter} adapter
   * @param {Function} callback - called with 'light' or 'dark' when theme changes
   */
  function start(adapter, callback) {
    _callback = callback;
    _currentTheme = adapter.getThemeMode();
    callback(_currentTheme);

    // Watch for class/attribute changes on html and body
    _observer = new MutationObserver(() => {
      const newTheme = adapter.getThemeMode();
      if (newTheme !== _currentTheme) {
        _currentTheme = newTheme;
        if (_callback) _callback(newTheme);
      }
    });

    _observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-mode', 'style']
    });

    _observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-mode', 'style']
    });

    // Also watch for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      const newTheme = adapter.getThemeMode();
      if (newTheme !== _currentTheme) {
        _currentTheme = newTheme;
        if (_callback) _callback(newTheme);
      }
    });
  }

  /**
   * Stop monitoring.
   */
  function stop() {
    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }
    _callback = null;
  }

  /**
   * Get the current detected theme.
   * @returns {'light'|'dark'}
   */
  function getCurrentTheme() {
    return _currentTheme;
  }

  return { start, stop, getCurrentTheme };
})();
