/**
 * Sanitize text content to prevent XSS.
 */
const Sanitize = {
  /**
   * Escape HTML special characters in a string.
   * @param {string} str
   * @returns {string}
   */
  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Strip all HTML tags from a string, returning plain text.
   * @param {string} html
   * @returns {string}
   */
  stripTags(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  },

  /**
   * Sanitize a string for use as a filename.
   * @param {string} name
   * @returns {string}
   */
  fileName(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  }
};
