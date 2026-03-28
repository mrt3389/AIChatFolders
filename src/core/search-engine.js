/**
 * Search Engine — tokenized full-text search with CJK support.
 */
const SearchEngine = (() => {
  // CJK Unicode ranges
  const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}]/u;

  /**
   * Tokenize a string into searchable tokens.
   * Handles CJK characters (each as individual token) and Latin words.
   * @param {string} text
   * @returns {string[]}
   */
  function tokenize(text) {
    if (!text) return [];
    const tokens = new Set();
    const lower = text.toLowerCase();

    // Split by non-alphanumeric (keep CJK)
    const parts = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

    for (const part of parts) {
      // Add the full word/part
      tokens.add(part);
      // For CJK, also add individual characters
      for (const char of part) {
        if (CJK_REGEX.test(char)) {
          tokens.add(char);
        }
      }
    }

    // Also generate bigrams for CJK text
    for (let i = 0; i < lower.length - 1; i++) {
      if (CJK_REGEX.test(lower[i]) && CJK_REGEX.test(lower[i + 1])) {
        tokens.add(lower[i] + lower[i + 1]);
      }
    }

    return Array.from(tokens);
  }

  /**
   * Index a conversation for search.
   * @param {string} conversationId
   * @param {string} title
   * @returns {Promise<void>}
   */
  async function indexConversation(conversationId, title) {
    const tokens = tokenize(title);
    const record = {
      conversationId,
      tokens,
      titleLower: (title || '').toLowerCase()
    };
    await DB.put('searchIndex', record);
  }

  /**
   * Search conversations by query string.
   * @param {string} query
   * @param {number} [limit=50]
   * @returns {Promise<Object[]>} matched conversations
   */
  async function search(query, limit = 50) {
    if (!query || !query.trim()) return [];

    const queryTokens = tokenize(query.trim());
    if (queryTokens.length === 0) return [];

    // Collect matching conversation IDs with match scores
    const scores = new Map();

    for (const token of queryTokens) {
      // Try exact token match via multiEntry index
      const matches = await DB.queryByIndex('searchIndex', 'tokens', token);
      for (const match of matches) {
        const current = scores.get(match.conversationId) || 0;
        scores.set(match.conversationId, current + 1);
      }
    }

    // Also do prefix search on titleLower
    const allSearchIndex = await DB.getAll('searchIndex');
    const queryLower = query.trim().toLowerCase();
    for (const record of allSearchIndex) {
      if (record.titleLower.includes(queryLower)) {
        const current = scores.get(record.conversationId) || 0;
        // Boost substring match score
        scores.set(record.conversationId, current + 2);
      }
    }

    // Sort by score descending
    const sortedIds = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    // Fetch conversation details
    const results = [];
    for (const id of sortedIds) {
      const conv = await DB.get('conversations', id);
      if (conv) {
        results.push(conv);
      }
    }

    return results;
  }

  /**
   * Remove a conversation from the search index.
   * @param {string} conversationId
   * @returns {Promise<void>}
   */
  async function removeFromIndex(conversationId) {
    await DB.remove('searchIndex', conversationId);
  }

  /**
   * Rebuild the entire search index.
   * @returns {Promise<void>}
   */
  async function rebuildIndex() {
    await DB.clear('searchIndex');
    const conversations = await DB.getAll('conversations');
    for (const conv of conversations) {
      await indexConversation(conv.id, conv.title);
    }
  }

  return { tokenize, indexConversation, search, removeFromIndex, rebuildIndex };
})();
