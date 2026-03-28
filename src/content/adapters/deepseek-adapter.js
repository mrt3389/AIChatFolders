/**
 * DeepSeek Adapter — DOM selectors and hooks for chat.deepseek.com
 */
class DeepSeekAdapter extends BaseAdapter {
  constructor() {
    super('deepseek', 'DeepSeek');

    this._listContainerSelectors = [
      // 2024+ 新版布局
      '[class*="_sidebar"]',
      '[class*="sidebar"]',
      'aside[class*="sidebar"]',
      // 旧版布局
      'div[class*="conversation-list"]',
      'div[class*="chat-list"]',
      'div[class*="session-list"]',
      'nav[class*="sidebar"]',
      'div.sidebar nav',
      'aside nav',
      'aside > div > div',
      // 通用备选
      'aside',
      'nav'
    ];

    this._sidebarSelectors = [
      // 2024+ 新版布局 - 更灵活的选择器
      '[class*="_sidebar"]',
      '[class*="Sidebar"]',
      'div[class*="sidebar"]',
      'aside[class*="sidebar"]',
      'aside',
      'nav[class*="sidebar"]',
      '[role="navigation"]',
      'nav'
    ];

    this._newChatBtnSelectors = [
      // 2024+ 新版 - 查找主按钮区域
      'button[class*="new"]',
      'a[class*="new"]',
      '[class*="sidebar"] button',
      '[class*="sidebar"] a[href="/"]',
      // 旧版
      'div[class*="sidebar"] > div > a[href="/"]',
      'div[class*="sidebar"] > div > div:first-child a',
      'div[class*="sidebar"] > div > div:first-child',
      // 备选：查找任何带加号或新建文字的按钮
      'button:has(svg)',
      'a:has(svg)'
    ];
  }

  getSidebarContainer() {
    return this._trySelectors(this._sidebarSelectors);
  }

  getInsertionPoint() {
    // 精确查找：在 ds-scroll-area 上方插入
    const scrollArea = document.querySelector('[class*="ds-scroll-area"]');
    if (scrollArea && scrollArea.parentElement) {
      console.log('[AI Chat Folders] DeepSeek: found scroll-area', scrollArea);
      return { parent: scrollArea.parentElement, afterElement: scrollArea.previousElementSibling };
    }
  
    // 备选：查找侧边栏容器
    const sidebar = this.getSidebarContainer();
    if (!sidebar) {
      console.log('[AI Chat Folders] DeepSeek: sidebar not found');
      return null;
    }
  
    console.log('[AI Chat Folders] DeepSeek: found sidebar, using fallback', sidebar);
  
    // 备选策略：查找第一个可滚动容器
    const fallbackScroll = sidebar.querySelector('[class*="scroll"]') || 
                           sidebar.querySelector('[style*="overflow"]');
    if (fallbackScroll && fallbackScroll.parentElement) {
      return { parent: fallbackScroll.parentElement, afterElement: fallbackScroll.previousElementSibling };
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
      'a[href*="/chat/s/"]',
      'a[href*="/chat/"]',
      'nav a[href]'
    ]);

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href || href === '/chat' || href === '/chat/' || href === '/') continue;

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
    return element.dataset.sessionId || element.dataset.id || null;
  }

  extractConversationTitle(element) {
    return this._extractTitle(element);
  }

  getConversationUrl(platformId) {
    return `https://chat.deepseek.com/a/chat/s/${platformId}`;
  }

  getThemeMode() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) return 'dark';
    if (html.getAttribute('data-theme') === 'dark') return 'dark';
    const bg = getComputedStyle(document.body).backgroundColor;
    if (bg) {
      const rgb = bg.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        if (brightness < 128) return 'dark';
      }
    }
    return 'light';
  }

  getConversationListSelector() {
    return 'nav, div[class*="sidebar"], div[class*="conversation"], aside';
  }

  _extractIdFromHref(href) {
    if (!href) return null;
    const match = href.match(/\/chat\/(?:s\/)?([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const parts = href.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  }

  _extractTitle(element) {
    const titleEl = element.querySelector(
      '[class*="title"], [class*="name"], [class*="text"], span, p'
    );
    if (titleEl) {
      const text = titleEl.textContent.trim();
      if (text) return text;
    }
    const text = element.textContent.trim();
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
  }
}
