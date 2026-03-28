/**
 * Message bus abstraction for chrome.runtime messaging.
 * Supports request-response pattern via requestId.
 */
const MessageBus = (() => {
  // Message action types
  const Actions = {
    // Conversation scanning
    SCAN_CONVERSATIONS: 'SCAN_CONVERSATIONS',
    // Folder operations
    GET_FOLDER_TREE: 'GET_FOLDER_TREE',
    FOLDER_TREE_UPDATED: 'FOLDER_TREE_UPDATED',
    CREATE_FOLDER: 'CREATE_FOLDER',
    RENAME_FOLDER: 'RENAME_FOLDER',
    DELETE_FOLDER: 'DELETE_FOLDER',
    MOVE_FOLDER: 'MOVE_FOLDER',
    REORDER_FOLDERS: 'REORDER_FOLDERS',
    SET_FOLDER_COLOR: 'SET_FOLDER_COLOR',
    TOGGLE_FOLDER_COLLAPSE: 'TOGGLE_FOLDER_COLLAPSE',
    // Conversation operations
    MOVE_CONVERSATION: 'MOVE_CONVERSATION',
    REMOVE_FROM_FOLDER: 'REMOVE_FROM_FOLDER',
    TOGGLE_PIN: 'TOGGLE_PIN',
    BATCH_MOVE: 'BATCH_MOVE',
    GET_CONVERSATIONS: 'GET_CONVERSATIONS',
    GET_PINNED: 'GET_PINNED',
    GET_UNFILED: 'GET_UNFILED',
    // Search
    SEARCH: 'SEARCH',
    SEARCH_RESULTS: 'SEARCH_RESULTS',
    // Data sync
    EXPORT_DATA: 'EXPORT_DATA',
    IMPORT_DATA: 'IMPORT_DATA',
    // Settings
    GET_SETTINGS: 'GET_SETTINGS',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    SETTINGS_CHANGED: 'SETTINGS_CHANGED',
    // Theme
    THEME_CHANGED: 'THEME_CHANGED',
    // General
    PING: 'PING',
    PONG: 'PONG',
    ERROR: 'ERROR'
  };

  let _requestId = 0;
  const _pendingRequests = new Map();

  /**
   * Send a message to the background service worker (or from background to tabs).
   * @param {string} action - one of Actions.*
   * @param {Object} payload
   * @returns {Promise<Object>} response payload
   */
  function send(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const requestId = String(++_requestId);
      const message = { action, payload, requestId };

      _pendingRequests.set(requestId, { resolve, reject });

      // Auto-cleanup after 30s timeout
      setTimeout(() => {
        if (_pendingRequests.has(requestId)) {
          _pendingRequests.delete(requestId);
          reject(new Error(`Message timeout: ${action}`));
        }
      }, 30000);

      browserAPI.runtime.sendMessage(message, (response) => {
        if (browserAPI.runtime.lastError) {
          _pendingRequests.delete(requestId);
          reject(new Error(browserAPI.runtime.lastError.message));
          return;
        }
        _pendingRequests.delete(requestId);
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response ? response.payload : null);
        }
      });
    });
  }

  /**
   * Send a message to a specific tab's content script.
   * @param {number} tabId
   * @param {string} action
   * @param {Object} payload
   */
  function sendToTab(tabId, action, payload = {}) {
    browserAPI.tabs.sendMessage(tabId, { action, payload });
  }

  /**
   * Broadcast a message to all tabs.
   * @param {string} action
   * @param {Object} payload
   */
  function broadcast(action, payload = {}) {
    browserAPI.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        try {
          browserAPI.tabs.sendMessage(tab.id, { action, payload });
        } catch (e) {
          // Tab may not have content script, ignore
        }
      }
    });
  }

  /**
   * Register a message handler.
   * The handler receives (action, payload, sender) and should return a response payload or a Promise.
   * @param {Function} handler - async (action, payload, sender) => responsePayload
   */
  function onMessage(handler) {
    browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const { action, payload, requestId } = message;

      // Handle as a request that needs a response
      const result = handler(action, payload, sender);

      if (result instanceof Promise) {
        result.then((responsePayload) => {
          sendResponse({ payload: responsePayload, requestId });
        }).catch((err) => {
          sendResponse({ error: err.message, requestId });
        });
        return true; // Keep the message channel open for async response
      }

      if (result !== undefined) {
        sendResponse({ payload: result, requestId });
      }

      return false;
    });
  }

  return { Actions, send, sendToTab, broadcast, onMessage };
})();
