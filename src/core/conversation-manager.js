/**
 * Conversation Manager — track, assign, pin conversations.
 */
const ConversationManager = (() => {
  /**
   * Track (upsert) a conversation from platform scanning.
   * @param {string} platformId - platform's native conversation ID
   * @param {string} platform - "doubao"|"kimi"|"deepseek"
   * @param {string} title
   * @param {string} url
   * @returns {Promise<Object>} the conversation record
   */
  async function trackConversation(platformId, platform, title, url) {
    // Check if already tracked
    const existing = await DB.queryByIndex(
      'conversations', 'platform_platformId', [platform, platformId]
    );

    if (existing.length > 0) {
      const conv = existing[0];
      let changed = false;
      if (conv.title !== title) {
        conv.title = title;
        changed = true;
      }
      if (conv.url !== url) {
        conv.url = url;
        changed = true;
      }
      conv.lastSeenAt = Date.now();
      if (changed) conv.updatedAt = Date.now();
      await DB.put('conversations', conv);

      // Update search index if title changed
      if (changed) {
        await SearchEngine.indexConversation(conv.id, title);
      }
      return conv;
    }

    // Create new
    const conv = {
      id: generateUUID(),
      platformId,
      platform,
      title,
      url,
      folderId: null,
      isPinned: false,
      pinOrder: 0,
      orderInFolder: 0,
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await DB.put('conversations', conv);
    await SearchEngine.indexConversation(conv.id, title);
    return conv;
  }

  /**
   * Assign a conversation to a folder.
   * @param {string} conversationId
   * @param {string} folderId
   * @param {number} [order]
   * @returns {Promise<Object>}
   */
  async function assignToFolder(conversationId, folderId, order) {
    const conv = await DB.get('conversations', conversationId);
    if (!conv) throw new Error('Conversation not found: ' + conversationId);

    conv.folderId = folderId;
    if (order !== undefined) {
      conv.orderInFolder = order;
    } else {
      // Place at end
      const siblings = await DB.queryByIndex('conversations', 'folderId', folderId);
      const maxOrder = siblings.reduce((max, c) => Math.max(max, c.orderInFolder || 0), 0);
      conv.orderInFolder = maxOrder + 1;
    }
    conv.updatedAt = Date.now();
    await DB.put('conversations', conv);
    return conv;
  }

  /**
   * Remove a conversation from its folder (move to unfiled).
   * @param {string} conversationId
   * @returns {Promise<Object>}
   */
  async function removeFromFolder(conversationId) {
    const conv = await DB.get('conversations', conversationId);
    if (!conv) throw new Error('Conversation not found: ' + conversationId);
    conv.folderId = null;
    conv.orderInFolder = 0;
    conv.updatedAt = Date.now();
    await DB.put('conversations', conv);
    return conv;
  }

  /**
   * Toggle pin status of a conversation.
   * @param {string} conversationId
   * @returns {Promise<Object>}
   */
  async function togglePin(conversationId) {
    const conv = await DB.get('conversations', conversationId);
    if (!conv) throw new Error('Conversation not found: ' + conversationId);

    conv.isPinned = !conv.isPinned;
    if (conv.isPinned) {
      const pinned = await DB.queryByIndex('conversations', 'isPinned', true);
      const maxPinOrder = pinned.reduce((max, c) => Math.max(max, c.pinOrder || 0), 0);
      conv.pinOrder = maxPinOrder + 1;
    } else {
      conv.pinOrder = 0;
    }
    conv.updatedAt = Date.now();
    await DB.put('conversations', conv);
    return conv;
  }

  /**
   * Batch move multiple conversations to a folder.
   * @param {string[]} conversationIds
   * @param {string} folderId
   * @returns {Promise<void>}
   */
  async function batchMoveToFolder(conversationIds, folderId) {
    const existing = await DB.queryByIndex('conversations', 'folderId', folderId);
    let order = existing.reduce((max, c) => Math.max(max, c.orderInFolder || 0), 0);

    for (const id of conversationIds) {
      const conv = await DB.get('conversations', id);
      if (conv) {
        conv.folderId = folderId;
        conv.orderInFolder = ++order;
        conv.updatedAt = Date.now();
        await DB.put('conversations', conv);
      }
    }
  }

  /**
   * Get all conversations for a specific platform.
   * @param {string} platform
   * @returns {Promise<Object[]>}
   */
  async function getByPlatform(platform) {
    return DB.queryByIndex('conversations', 'platform', platform);
  }

  /**
   * Get all pinned conversations.
   * @returns {Promise<Object[]>}
   */
  async function getPinned() {
    const all = await DB.queryByIndex('conversations', 'isPinned', true);
    return all.sort((a, b) => (a.pinOrder || 0) - (b.pinOrder || 0));
  }

  /**
   * Get unfiled conversations.
   * @returns {Promise<Object[]>}
   */
  async function getUnfiled() {
    const all = await DB.queryByIndex('conversations', 'folderId', null);
    return all.sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
  }

  /**
   * Delete a conversation record.
   * @param {string} conversationId
   * @returns {Promise<void>}
   */
  async function deleteConversation(conversationId) {
    await DB.remove('conversations', conversationId);
    await DB.remove('searchIndex', conversationId);
  }

  return {
    trackConversation,
    assignToFolder,
    removeFromFolder,
    togglePin,
    batchMoveToFolder,
    getByPlatform,
    getPinned,
    getUnfiled,
    deleteConversation
  };
})();
