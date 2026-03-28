/**
 * Doubao (豆包) Adapter — DOM selectors and hooks for www.doubao.com/chat
 */
class DoubaoAdapter extends BaseAdapter {
  constructor() {
    super('doubao', '豆包');

    this._listContainerSelectors = [
      // 2024+ 新版布局
      '[class*="_sidebar"] [class*="list"]',
      '[class*="chat-list"]',
      '[class*="conversation-list"]',
      // 旧版布局
      'nav > div > div:nth-child(3)',
      'div[class*="session-list"]',
      'nav[class*="sidebar"]',
      'div[class*="history"]',
      'aside div[class*="list"]',
      // 通用备选
      '[role="list"]',
      'nav ul'
    ];

    this._sidebarSelectors = [
      // 2024+ 新版布局
      '[class*="_sidebar"]',
      '[class*="Sidebar"]',
      'aside[class*="sidebar"]',
      // 旧版布局
      'nav[class*="left-side"]',
      'nav',
      'div[class*="sidebar"]',
      'aside',
      '[role="navigation"]'
    ];

    this._newChatBtnSelectors = [
      // 2024+ 新版布局
      'button[class*="new"]',
      'a[class*="new"]',
      '[class*="sidebar"] button:first-of-type',
      // 旧版布局
      'nav > div > div:nth-child(2)',
      'div[class*="new-chat"]'
    ];
  }

  getSidebarContainer() {
    return this._trySelectors(this._sidebarSelectors);
  }

  getInsertionPoint() {
    // 精确查找：在 data-history-container 上方插入
    const historyContainer = document.querySelector('[data-history-container="true"]');
    if (historyContainer && historyContainer.parentElement) {
      console.log('[汇聊] Doubao: found history-container', historyContainer);
      return { parent: historyContainer.parentElement, afterElement: historyContainer.previousElementSibling };
    }
  
    // 备选：查找侧边栏
    const sidebar = this.getSidebarContainer();
    if (!sidebar) {
      console.log('[汇聊] Doubao: sidebar not found');
      return null;
    }
  
    console.log('[汇聊] Doubao: found sidebar, using fallback', sidebar);
  
    // 备选策略：查找新聊天按钮
    const newChatBtn = this._trySelectors(this._newChatBtnSelectors, sidebar);
    if (newChatBtn && newChatBtn.parentElement) {
      return { parent: newChatBtn.parentElement, afterElement: newChatBtn };
    }
  
    // 最终备选
    const innerContainer = sidebar.querySelector(':scope > div') || sidebar;
    const firstChild = innerContainer.querySelector(':scope > *:first-child');
    return { parent: innerContainer, afterElement: firstChild };
  }

  getConversationListContainer() {
    return this._trySelectors(this._listContainerSelectors);
  }

  getConversationItems() {
    const items = [];

    // Strategy 1: Links with chat URLs
    const links = this._trySelectorsAll([
      'a[href*="/chat/"]',
      'a[href*="/thread/"]'
    ]);

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href || href === '/chat' || href === '/chat/') continue;

      const platformId = this._extractIdFromHref(href);
      if (!platformId) continue;

      const title = this._extractTitle(link);
      if (!title) continue;

      items.push({
        platformId,
        title,
        url: new URL(href, window.location.origin).href,
        element: link
      });
    }

    // Strategy 2: If virtual scrolling hides links, try data attributes
    if (items.length === 0) {
      const divItems = this._trySelectorsAll([
        'div[data-testid*="conversation"]',
        'div[data-testid*="session"]',
        'div[class*="conversation"][role="button"]',
        'div[class*="session"][role="button"]'
      ]);

      for (const div of divItems) {
        const platformId = div.dataset.testid || div.dataset.id || div.dataset.sessionId;
        if (!platformId) continue;

        const title = this._extractTitle(div);
        if (!title) continue;

        items.push({
          platformId: platformId.replace(/^(conversation|session)-/, ''),
          title,
          url: `https://www.doubao.com/chat/${platformId}`,
          element: div
        });
      }
    }

    // Deduplicate
    const seen = new Set();
    return items.filter(item => {
      if (seen.has(item.platformId)) return false;
      seen.add(item.platformId);
      return true;
    });
  }

  extractConversationId(element) {
    const link = element.tagName === 'A' ? element : element.querySelector('a[href]');
    if (link) {
      return this._extractIdFromHref(link.getAttribute('href'));
    }
    return element.dataset.testid || element.dataset.id || element.dataset.sessionId || null;
  }

  extractConversationTitle(element) {
    return this._extractTitle(element);
  }

  getConversationUrl(platformId) {
    return `https://www.doubao.com/chat/${platformId}`;
  }

  getThemeMode() {
    const html = document.documentElement;
    const body = document.body;
    // Doubao may use theme attribute or class
    if (html.getAttribute('data-theme') === 'dark') return 'dark';
    if (html.classList.contains('dark') || html.classList.contains('theme-dark')) return 'dark';
    if (body.classList.contains('dark') || body.classList.contains('theme-dark')) return 'dark';
    return super.getThemeMode();
  }

  getConversationListSelector() {
    return 'nav, aside, div[class*="sidebar"], div[class*="conversation"], div[class*="session"], div[class*="history"]';
  }

  _extractIdFromHref(href) {
    if (!href) return null;
    // Match /chat/<id> or /thread/<id>
    const match = href.match(/\/(?:chat|thread)\/([a-zA-Z0-9_-]+)/);
    if (match && match[1] !== 'chat') return match[1];
    return null;
  }

  _extractTitle(element) {
    // Doubao may nest title deeper due to React component structure
    const titleEl = element.querySelector(
      '[class*="title"], [class*="name"], [class*="text"], [class*="content"] > span, p'
    );
    if (titleEl) {
      const text = titleEl.textContent.trim();
      if (text && text.length > 1) return text;
    }
    const text = element.textContent.trim();
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
  }
}
