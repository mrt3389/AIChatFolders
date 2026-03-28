/**
 * Kimi Adapter — DOM selectors and hooks for kimi.moonshot.cn / kimi.ai
 */
class KimiAdapter extends BaseAdapter {
  constructor() {
    super('kimi', 'Kimi');

    this._listContainerSelectors = [
      // 2024+ 新版布局
      '[class*="_sidebar"] [class*="list"]',
      '[class*="chatList"]',
      '[class*="ChatList"]',
      // 旧版布局
      'div[class*="chat-list"]',
      'div[class*="conversation-list"]',
      'div[class*="history-list"]',
      'div[class*="history"]',
      '.sidebar-nav',
      'nav[class*="sidebar"]',
      'aside div[class*="list"]',
      // 通用备选
      '[role="list"]'
    ];

    this._sidebarSelectors = [
      // 2024+ 新版布局
      '[class*="_sidebar"]',
      '[class*="Sidebar"]',
      'aside[class*="sidebar"]',
      // 旧版布局
      '.sidebar',
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
      '.sidebar-nav > a[href*="new_chat"]',
      'a[class*="new-chat"]',
      'a[href*="new_chat"]',
      '.sidebar-nav > a:first-of-type',
      '.sidebar-nav > div:first-child'
    ];
  }

  getSidebarContainer() {
    return this._trySelectors(this._sidebarSelectors);
  }

  getInsertionPoint() {
    // 精确查找：在 history-part 上方插入
    const historyPart = document.querySelector('div.history-part');
    if (historyPart && historyPart.parentElement) {
      console.log('[汇聊] Kimi: found history-part', historyPart);
      return { parent: historyPart.parentElement, afterElement: historyPart.previousElementSibling };
    }
  
    // 备选：查找侧边栏
    const sidebar = this.getSidebarContainer();
    if (!sidebar) {
      console.log('[汇聊] Kimi: sidebar not found');
      return null;
    }
  
    console.log('[汇聊] Kimi: found sidebar, using fallback', sidebar);
  
    // 备选策略：查找 sidebar-nav 元素
    const sidebarNav = sidebar.querySelector('.sidebar-nav');
    if (sidebarNav) {
      const firstChild = sidebarNav.firstElementChild;
      return { parent: sidebarNav, afterElement: firstChild };
    }
  
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
    const links = this._trySelectorsAll([
      'a[href*="/chat/"]',
      'a[href*="/kimiplus/"]'
    ]);

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;
      if (href.includes('new_chat')) continue;

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
    return element.dataset.chatId || element.dataset.id || null;
  }

  extractConversationTitle(element) {
    return this._extractTitle(element);
  }

  getConversationUrl(platformId) {
    // 根据当前域名返回正确的URL
    const host = window.location.host;
    if (host.includes('kimi.com')) {
      return `https://www.kimi.com/chat/${platformId}`;
    }
    return `https://kimi.moonshot.cn/chat/${platformId}`;
  }

  getThemeMode() {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') === 'dark') return 'dark';
    if (html.classList.contains('dark')) return 'dark';
    if (document.body.classList.contains('dark')) return 'dark';
    const app = document.querySelector('.app');
    if (app && app.classList.contains('dark')) return 'dark';
    return super.getThemeMode();
  }

  getConversationListSelector() {
    return 'nav, aside, div[class*="sidebar"], div[class*="chat-list"], div[class*="history"]';
  }

  _extractIdFromHref(href) {
    if (!href) return null;
    const match = href.match(/\/chat\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const match2 = href.match(/\/kimiplus\/([a-zA-Z0-9_-]+)/);
    if (match2) return match2[1];
    return null;
  }

  _extractTitle(element) {
    const titleEl = element.querySelector(
      '[class*="title"], [class*="name"], [class*="text"], span:not([class*="time"]):not([class*="date"])'
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
