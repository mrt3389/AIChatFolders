/**
 * Internationalization wrapper around chrome.i18n API.
 */
const i18n = {
  /**
   * Get a localized message by key.
   * @param {string} key - message key from _locales/messages.json
   * @param {string|string[]} [substitutions] - placeholder values
   * @returns {string}
   */
  t(key, substitutions) {
    try {
      const msg = browserAPI.i18n.getMessage(key, substitutions);
      return msg || key;
    } catch (e) {
      return key;
    }
  },

  /**
   * Get the current UI language.
   * @returns {string}
   */
  getLanguage() {
    try {
      return browserAPI.i18n.getUILanguage();
    } catch (e) {
      return navigator.language || 'en';
    }
  }
};
