/**
 * Folder Tree — recursive folder tree renderer with expand/collapse.
 */
const FolderTreeComponent = (() => {
  const FOLDER_COLORS = [
    '#4a90d9', '#e74c3c', '#27ae60', '#f39c12',
    '#9b59b6', '#1abc9c', '#e67e22', '#3498db',
    '#e84393', '#00b894', '#fdcb6e', '#6c5ce7'
  ];

  /**
   * Render a folder node and its children recursively.
   * @param {Object} folderNode - { id, name, color, isCollapsed, children, conversations }
   * @param {Object} options
   * @param {ShadowRoot} options.shadowRoot
   * @param {Function} options.onFolderAction - (action, folderId, data?) => void
   * @param {Function} options.onConversationAction - (action, conv) => void
   * @param {Function} options.onConversationClick - (conv) => void
   * @param {number} [options.depth=0]
   * @returns {HTMLElement}
   */
  function renderFolder(folderNode, options) {
    const { shadowRoot, onFolderAction, onConversationAction, onConversationClick, depth = 0 } = options;
    const folder = DOM.create('div', {
      className: 'acf-folder',
      dataset: { folderId: folderNode.id }
    });

    // Folder row
    const row = DOM.create('div', {
      className: 'acf-folder__row',
      style: { paddingLeft: `${8 + depth * 16}px` }
    });

    // Chevron (expand/collapse)
    const chevronIcon = folderNode.isCollapsed ? 'chevronRight' : 'chevronDown';
    const chevron = SVGIcons.createIcon(chevronIcon, 14,
      `acf-folder__chevron ${folderNode.isCollapsed ? 'acf-folder__chevron--collapsed' : 'acf-folder__chevron--expanded'}`
    );
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      onFolderAction('toggleCollapse', folderNode.id);
    });
    row.appendChild(chevron);

    // Folder icon
    const folderIcon = SVGIcons.createIcon(
      folderNode.isCollapsed ? 'folder' : 'folderOpen', 16, 'acf-folder__icon'
    );
    if (folderNode.color) {
      folderIcon.style.color = folderNode.color;
    }
    row.appendChild(folderIcon);

    // Folder name
    const name = DOM.create('span', {
      className: 'acf-folder__name',
      textContent: folderNode.name
    });
    row.appendChild(name);

    // Count badge
    const totalCount = _countAllConversations(folderNode);
    const count = DOM.create('span', {
      className: 'acf-folder__count',
      textContent: totalCount > 0 ? String(totalCount) : ''
    });
    row.appendChild(count);

    // Actions button
    const actions = DOM.create('button', {
      className: 'acf-icon-btn acf-folder__actions',
      onClick: (e) => {
        e.stopPropagation();
        _showFolderContextMenu(shadowRoot, folderNode, e, onFolderAction);
      }
    }, [SVGIcons.createIcon('moreVertical', 14)]);
    row.appendChild(actions);

    // Click to toggle
    row.addEventListener('click', () => {
      onFolderAction('toggleCollapse', folderNode.id);
    });

    // Right-click context menu
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      _showFolderContextMenu(shadowRoot, folderNode, e, onFolderAction);
    });

    // Double-click to rename
    row.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      onFolderAction('rename', folderNode.id);
    });

    folder.appendChild(row);

    // Children container
    const children = DOM.create('div', {
      className: `acf-folder__children ${folderNode.isCollapsed ? 'acf-folder__children--collapsed' : ''}`
    });

    // Sub-folders
    if (folderNode.children && folderNode.children.length > 0) {
      for (const child of folderNode.children) {
        const childEl = renderFolder(child, { ...options, depth: depth + 1 });
        children.appendChild(childEl);
      }
    }

    // Conversations inside this folder
    if (folderNode.conversations && folderNode.conversations.length > 0) {
      for (const conv of folderNode.conversations) {
        const convEl = ConversationItemComponent.create(conv, {
          shadowRoot,
          indentLevel: depth + 1,
          showPlatformBadge: true,
          onContextMenu: (c, e) => {
            _showConversationContextMenu(shadowRoot, c, e, onConversationAction);
          },
          onClick: onConversationClick
        });
        children.appendChild(convEl);
      }
    }

    // Empty state for expanded folder with no content
    if (!folderNode.isCollapsed &&
        (!folderNode.children || folderNode.children.length === 0) &&
        (!folderNode.conversations || folderNode.conversations.length === 0)) {
      const empty = DOM.create('div', {
        className: 'acf-empty',
        style: { padding: '8px 16px', paddingLeft: `${24 + depth * 16}px` }
      }, [i18n.t('folderEmpty')]);
      children.appendChild(empty);
    }

    if (!folderNode.isCollapsed) {
      children.style.maxHeight = children.scrollHeight + 1000 + 'px';
    }

    folder.appendChild(children);
    return folder;
  }

  /**
   * Render the full folder tree.
   * @param {Array} tree - array of root folder nodes
   * @param {Object} options - same as renderFolder options
   * @returns {DocumentFragment}
   */
  function renderTree(tree, options) {
    const fragment = document.createDocumentFragment();
    for (const node of tree) {
      fragment.appendChild(renderFolder(node, options));
    }
    return fragment;
  }

  /**
   * Create the color picker sub-menu.
   * @param {ShadowRoot} shadowRoot
   * @param {string} folderId
   * @param {string|null} currentColor
   * @param {Function} onFolderAction
   * @returns {HTMLElement}
   */
  function _createColorPicker(currentColor) {
    const picker = DOM.create('div', { className: 'acf-color-picker' });
    for (const color of FOLDER_COLORS) {
      const swatch = DOM.create('div', {
        className: `acf-color-swatch ${color === currentColor ? 'acf-color-swatch--active' : ''}`,
        style: { backgroundColor: color },
        dataset: { color }
      });
      picker.appendChild(swatch);
    }
    // "No color" option
    const noColor = DOM.create('div', {
      className: `acf-color-swatch ${!currentColor ? 'acf-color-swatch--active' : ''}`,
      style: {
        backgroundColor: 'transparent',
        border: '2px dashed var(--acf-border)'
      },
      dataset: { color: '' }
    });
    picker.appendChild(noColor);
    return picker;
  }

  function _showFolderContextMenu(shadowRoot, folderNode, event, onFolderAction) {
    ContextMenu.show(shadowRoot, event.clientX, event.clientY, [
      { label: i18n.t('addSubfolder'), icon: 'folderPlus', action: () => onFolderAction('addSubfolder', folderNode.id) },
      { label: i18n.t('rename'), icon: 'edit', action: () => onFolderAction('rename', folderNode.id) },
      { label: i18n.t('setColor'), icon: 'palette', action: () => onFolderAction('setColor', folderNode.id, folderNode.color) },
      'separator',
      { label: i18n.t('delete'), icon: 'trash', danger: true, action: () => onFolderAction('delete', folderNode.id, folderNode.name) }
    ]);
  }

  function _showConversationContextMenu(shadowRoot, conv, event, onConversationAction) {
    ContextMenu.show(shadowRoot, event.clientX, event.clientY, [
      { label: i18n.t('openConversation'), icon: 'externalLink', action: () => onConversationAction('open', conv) },
      { label: conv.isPinned ? i18n.t('unpin') : i18n.t('pin'), icon: 'pin', action: () => onConversationAction('togglePin', conv) },
      'separator',
      { label: i18n.t('moveToFolder'), icon: 'folder', action: () => onConversationAction('moveToFolder', conv) },
      ...(conv.folderId ? [{ label: i18n.t('removeFromFolder'), icon: 'close', action: () => onConversationAction('removeFromFolder', conv) }] : []),
    ]);
  }

  function _countAllConversations(node) {
    let count = (node.conversations || []).length;
    for (const child of (node.children || [])) {
      count += _countAllConversations(child);
    }
    return count;
  }

  return { renderFolder, renderTree, FOLDER_COLORS };
})();
