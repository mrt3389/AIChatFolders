/**
 * Platform Detector — identifies which AI chat platform the current page belongs to.
 */
const PlatformDetector = (() => {
  const PLATFORMS = {
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek',
      patterns: [
        /^https:\/\/chat\.deepseek\.com/
      ]
    },
    kimi: {
      id: 'kimi',
      name: 'Kimi',
      patterns: [
        /^https:\/\/www\.kimi\.com/,
        /^https:\/\/kimi\.com/,
        /^https:\/\/kimi\.moonshot\.cn/,
        /^https:\/\/kimi\.ai/
      ]
    },
    doubao: {
      id: 'doubao',
      name: '豆包',
      patterns: [
        /^https:\/\/www\.doubao\.com\/chat/
      ]
    }
  };

  /**
   * Detect the current platform from the URL.
   * @param {string} [url] - defaults to current page URL
   * @returns {{ id: string, name: string } | null}
   */
  function detect(url) {
    const href = url || window.location.href;
    for (const [key, platform] of Object.entries(PLATFORMS)) {
      for (const pattern of platform.patterns) {
        if (pattern.test(href)) {
          return { id: platform.id, name: platform.name };
        }
      }
    }
    return null;
  }

  /**
   * Get all supported platform IDs.
   * @returns {string[]}
   */
  function getSupportedPlatforms() {
    return Object.keys(PLATFORMS);
  }

  return { detect, getSupportedPlatforms, PLATFORMS };
})();
