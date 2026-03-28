/**
 * Conversation Item — renders a single conversation row in the sidebar.
 */
const ConversationItemComponent = (() => {
  /**
   * Create a conversation item DOM element.
   * @param {Object} conv - conversation record from DB
   * @param {Object} options
   * @param {ShadowRoot} options.shadowRoot
   * @param {Function} options.onContextMenu - (conv, event) => void
   * @param {Function} options.onClick - (conv) => void
   * @param {boolean} [options.showPlatformBadge=false]
   * @param {boolean} [options.showPinIcon=true]
   * @param {number} [options.indentLevel=0]
   * @returns {HTMLElement}
   */
  function create(conv, options = {}) {
    const {
      onContextMenu,
      onClick,
      showPlatformBadge = false,
      showPinIcon = true,
      indentLevel = 0
    } = options;

    const el = DOM.create('div', {
      className: 'acf-conv',
      dataset: {
        conversationId: conv.id,
        platformId: conv.platformId,
        platform: conv.platform
      },
      draggable: 'true',
      style: { paddingLeft: `${16 + indentLevel * 16}px` }
    });

    // Drag handle
    const dragHandle = SVGIcons.createIcon('grip', 12, 'acf-conv__drag-handle');
    el.appendChild(dragHandle);

    // Chat icon
    const chatIcon = SVGIcons.createIcon('messageSquare', 14, 'acf-conv__icon');
    el.appendChild(chatIcon);

    // Title
    const title = DOM.create('span', {
      className: 'acf-conv__title',
      textContent: conv.title || '(无标题)'
    });
    el.appendChild(title);

    // Platform badge
    if (showPlatformBadge) {
      const badgeText = { deepseek: 'DS', kimi: 'Kimi', doubao: '豆包' }[conv.platform] || conv.platform;
      const badge = DOM.create('span', {
        className: `acf-badge acf-badge--${conv.platform}`,
        textContent: badgeText
      });
      el.appendChild(badge);
    }

    // Pin icon
    if (showPinIcon && conv.isPinned) {
      const pin = SVGIcons.createIcon('pinFilled', 12, 'acf-conv__pin acf-conv__pin--active');
      el.appendChild(pin);
    }

    // Action button
    const actionsBtn = DOM.create('button', {
      className: 'acf-icon-btn acf-conv__actions',
      onClick: (e) => {
        e.stopPropagation();
        if (onContextMenu) onContextMenu(conv, e);
      }
    }, [SVGIcons.createIcon('moreVertical', 14)]);
    el.appendChild(actionsBtn);

    // Click to open conversation
    el.addEventListener('click', (e) => {
      if (e.target.closest('.acf-conv__actions') || e.target.closest('.acf-conv__drag-handle')) return;
      if (onClick) onClick(conv);
    });

    // Right-click context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (onContextMenu) onContextMenu(conv, e);
    });

    return el;
  }

  return { create };
})();
