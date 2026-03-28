/**
 * Settings Manager — user preferences stored in browser.storage.sync.
 */
const SettingsManager = (() => {
  const STORAGE_KEY = 'settings';

  const DEFAULTS = {
    theme: 'auto',           // 'auto' | 'light' | 'dark'
    language: 'auto',        // 'auto' | 'en' | 'zh-CN'
    enabledPlatforms: ['doubao', 'kimi', 'deepseek'],
    showUnfiled: true,
    confirmBeforeDelete: true,
    autoScanInterval: 5000   // ms
  };

  let _cache = null;

  /**
   * Load settings from storage, merging with defaults.
   * @returns {Promise<Object>}
   */
  async function load() {
    try {
      const result = await storageSync.get(STORAGE_KEY);
      _cache = { ...DEFAULTS, ...(result[STORAGE_KEY] || {}) };
    } catch (e) {
      console.warn('Failed to load settings from sync, using defaults:', e);
      _cache = { ...DEFAULTS };
    }
    return _cache;
  }

  /**
   * Get current settings (from cache or load).
   * @returns {Promise<Object>}
   */
  async function get() {
    if (_cache) return _cache;
    return load();
  }

  /**
   * Update settings (partial merge).
   * @param {Object} partial - key-value pairs to update
   * @returns {Promise<Object>} full updated settings
   */
  async function update(partial) {
    const current = await get();
    const updated = { ...current, ...partial };
    _cache = updated;
    try {
      await storageSync.set({ [STORAGE_KEY]: updated });
    } catch (e) {
      console.warn('Failed to save settings to sync:', e);
      // Still keep in local cache
    }
    return updated;
  }

  /**
   * Reset settings to defaults.
   * @returns {Promise<Object>}
   */
  async function reset() {
    _cache = { ...DEFAULTS };
    await storageSync.set({ [STORAGE_KEY]: _cache });
    return _cache;
  }

  /**
   * Invalidate cache (force reload on next get).
   */
  function invalidateCache() {
    _cache = null;
  }

  return { load, get, update, reset, invalidateCache, DEFAULTS };
})();
