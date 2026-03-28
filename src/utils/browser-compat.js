/**
 * Cross-browser API compatibility layer.
 * Provides a unified `browserAPI` object that works across Chrome, Firefox, and Safari.
 */
const browserAPI = (() => {
  if (typeof browser !== 'undefined' && browser.runtime) {
    return browser;
  }
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  }
  throw new Error('No browser extension API found');
})();

// Promisify chrome callback APIs if needed
const storageSync = {
  async get(keys) {
    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.get(keys, (result) => {
        if (browserAPI.runtime.lastError) {
          reject(new Error(browserAPI.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  },
  async set(items) {
    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set(items, () => {
        if (browserAPI.runtime.lastError) {
          reject(new Error(browserAPI.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
};

const storageLocal = {
  async get(keys) {
    return new Promise((resolve, reject) => {
      browserAPI.storage.local.get(keys, (result) => {
        if (browserAPI.runtime.lastError) {
          reject(new Error(browserAPI.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  },
  async set(items) {
    return new Promise((resolve, reject) => {
      browserAPI.storage.local.set(items, () => {
        if (browserAPI.runtime.lastError) {
          reject(new Error(browserAPI.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
};
