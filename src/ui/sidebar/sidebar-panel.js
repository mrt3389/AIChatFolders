/**
 * Sidebar Panel — inline panel controller embedded in the platform's sidebar.
 * Uses .acf-panel class for inline (non-fixed) layout.
 */
const SidebarPanel = (() => {
  let _shadowRoot = null;
  let _panelEl = null;
  let _contentEl = null;
  let _searchBar = null;
  let _isSearching = false;
  let _treeData = null;
  let _settings = null;
  let _platform = null;

  /**
   * Initialize the sidebar panel inside a Shadow DOM root.
   * @param {ShadowRoot} shadowRoot
   * @param {string} platform - current platform ID
   * @param {Object} settings
   */
  async function init(shadowRoot, platform, settings) {
    _shadowRoot = shadowRoot;
    _platform = platform;
    _settings = settings;

    _buildDOM();
    _initDragDrop();
    _listenForMessages();

    // Load initial data
    await _refreshTree();
  }

  function _buildDOM() {
    // Main panel container (inline, embedded in platform sidebar)
    _panelEl = DOM.create('div', { className: 'acf-panel' });

    // Header with collapse toggle on left, actions on right
    const header = DOM.create('div', { className: 'acf-header' }, [
      DOM.create('div', { className: 'acf-header__left' }, [
        _createIconBtn('chevronDown', () => _toggleCollapse(), 'acf-toggle-btn'),
        DOM.create('div', { className: 'acf-header__title' }, [
          SVGIcons.createIcon('folder', 16),
          document.createTextNode(i18n.t('sidebarTitle'))
        ])
      ]),
      DOM.create('div', { className: 'acf-header__actions' }, [
        _createIconBtn('folderPlus', () => _handleCreateFolder())
      ])
    ]);
    _panelEl.appendChild(header);

    // Search bar
    _searchBar = SearchBarComponent.create({
      onSearch: _handleSearch,
      onClear: _handleSearchClear
    });
    _panelEl.appendChild(_searchBar);

    // Content area
    _contentEl = DOM.create('div', { className: 'acf-content' });
    _panelEl.appendChild(_contentEl);

    _shadowRoot.appendChild(_panelEl);
  }

  function _createIconBtn(icon, onClick, extraClass = '') {
    const btn = DOM.create('button', {
      className: 'acf-icon-btn' + (extraClass ? ' ' + extraClass : ''),
      onClick
    }, [SVGIcons.createIcon(icon, 14)]);
    return btn;
  }

  function _initDragDrop() {
    DragDropManager.init(_shadowRoot, async (dropInfo) => {
      try {
        if (dropInfo.type === 'conversation') {
          if (dropInfo.targetFolderId) {
            await MessageBus.send(MessageBus.Actions.BATCH_MOVE, {
              conversationIds: dropInfo.ids,
              folderId: dropInfo.targetFolderId,
              platform: _platform
            });
            Toast.show(_shadowRoot, `已移动 ${dropInfo.ids.length} 个对话`, 'success');
          }
        }
      } catch (err) {
        Toast.show(_shadowRoot, '操作失败: ' + err.message, 'error');
      }
    });
  }

  function _listenForMessages() {
    browserAPI.runtime.onMessage.addListener((message) => {
      if (message.action === MessageBus.Actions.FOLDER_TREE_UPDATED) {
        // Only update if the platform matches
        const { platform, treeData } = message.payload || {};
        if (platform === _platform) {
          _treeData = treeData;
          if (!_isSearching) _renderTree();
        }
      } else if (message.action === MessageBus.Actions.SETTINGS_CHANGED) {
        _settings = message.payload;
      }
    });
  }

  async function _refreshTree() {
    try {
      console.log('[汇聊] Refreshing folder tree for platform:', _platform);
      _treeData = await MessageBus.send(MessageBus.Actions.GET_FOLDER_TREE, { platform: _platform });
      console.log('[汇聊] Folder tree loaded:', _treeData);
      
      // Ensure _treeData has expected structure
      if (!_treeData) {
        _treeData = { tree: [], flatMap: {}, unfiled: [], pinned: [] };
      }
      if (!_treeData.tree) _treeData.tree = [];
      if (!_treeData.unfiled) _treeData.unfiled = [];
      if (!_treeData.pinned) _treeData.pinned = [];
      
      _renderTree();
    } catch (err) {
      console.error('[汇聊] Failed to load tree:', err);
      // Set empty tree data on error
      _treeData = { tree: [], flatMap: {}, unfiled: [], pinned: [] };
      // 显示空状态
      if (_contentEl) {
        DOM.empty(_contentEl);
        _contentEl.appendChild(DOM.create('div', { className: 'acf-empty' }, [
          SVGIcons.createIcon('folder', 28),
          DOM.create('div', { textContent: '加载失败: ' + (err.message || '未知错误') }),
          DOM.create('div', { 
            textContent: '请确保扩展已正确加载',
            style: { fontSize: '11px', marginTop: '4px', color: 'var(--acf-text-tertiary)' }
          })
        ]));
      }
    }
  }

  function _renderTree() {
    if (!_contentEl || !_treeData) return;
    DOM.empty(_contentEl);

    // Pinned section
    if (_treeData.pinned && _treeData.pinned.length > 0) {
      const pinnedSection = _createSection(
        i18n.t('pinnedSection'),
        _treeData.pinned.length,
        'pinned'
      );
      for (const conv of _treeData.pinned) {
        const el = ConversationItemComponent.create(conv, {
          shadowRoot: _shadowRoot,
          showPlatformBadge: true,
          showPinIcon: true,
          onContextMenu: _handleConversationContextMenu,
          onClick: _handleConversationClick
        });
        pinnedSection.appendChild(el);
      }
      _contentEl.appendChild(pinnedSection);
    }

    // Folder tree
    if (_treeData.tree && _treeData.tree.length > 0) {
      const treeFragment = FolderTreeComponent.renderTree(_treeData.tree, {
        shadowRoot: _shadowRoot,
        onFolderAction: _handleFolderAction,
        onConversationAction: _handleConversationAction,
        onConversationClick: _handleConversationClick
      });
      _contentEl.appendChild(treeFragment);
    }

    // Unfiled section
    if (_treeData.unfiled && _treeData.unfiled.length > 0) {
      const unfiledSection = _createSection(
        i18n.t('unfiledSection'),
        _treeData.unfiled.length,
        'unfiled'
      );
      for (const conv of _treeData.unfiled) {
        const el = ConversationItemComponent.create(conv, {
          shadowRoot: _shadowRoot,
          showPlatformBadge: true,
          onContextMenu: _handleConversationContextMenu,
          onClick: _handleConversationClick
        });
        unfiledSection.appendChild(el);
      }
      _contentEl.appendChild(unfiledSection);
    }

    // Empty state
    if ((!_treeData.tree || _treeData.tree.length === 0) &&
        (!_treeData.pinned || _treeData.pinned.length === 0) &&
        (!_treeData.unfiled || _treeData.unfiled.length === 0)) {
      _contentEl.appendChild(DOM.create('div', { className: 'acf-empty' }, [
        SVGIcons.createIcon('folder', 28),
        DOM.create('div', { textContent: '暂无对话记录' }),
        DOM.create('div', {
          textContent: '打开 AI 对话页面，插件将自动扫描您的对话记录',
          style: { fontSize: '11px', marginTop: '4px' }
        })
      ]));
    }
  }

  function _createSection(title, count, sectionId) {
    const section = DOM.create('div', {
      className: 'acf-section',
      dataset: { section: sectionId }
    });

    const header = DOM.create('div', { className: 'acf-section__header' }, [
      document.createTextNode(title),
      DOM.create('span', { className: 'acf-section__badge', textContent: String(count) })
    ]);

    section.appendChild(header);
    return section;
  }

  // === Search ===
  async function _handleSearch(query) {
    if (!query) {
      _handleSearchClear();
      return;
    }
    _isSearching = true;
    try {
      const results = await MessageBus.send(MessageBus.Actions.SEARCH, { query, limit: 50 });
      _renderSearchResults(results, query);
    } catch (err) {
      Toast.show(_shadowRoot, '搜索失败: ' + err.message, 'error');
    }
  }

  function _handleSearchClear() {
    _isSearching = false;
    _renderTree();
  }

  function _renderSearchResults(results, query) {
    DOM.empty(_contentEl);

    if (!results || results.length === 0) {
      _contentEl.appendChild(DOM.create('div', { className: 'acf-empty' }, [
        SVGIcons.createIcon('search', 28),
        DOM.create('div', { textContent: i18n.t('noResults') })
      ]));
      return;
    }

    const section = DOM.create('div', { className: 'acf-search-results' });
    const title = DOM.create('div', {
      className: 'acf-search-results__title',
      textContent: `找到 ${results.length} 个结果`
    });
    section.appendChild(title);

    for (const conv of results) {
      const el = ConversationItemComponent.create(conv, {
        shadowRoot: _shadowRoot,
        showPlatformBadge: true,
        showPinIcon: true,
        onContextMenu: _handleConversationContextMenu,
        onClick: _handleConversationClick
      });
      section.appendChild(el);
    }

    _contentEl.appendChild(section);
  }

  // === Folder Actions ===
  async function _handleFolderAction(action, folderId, data) {
    try {
      switch (action) {
        case 'toggleCollapse':
          await MessageBus.send(MessageBus.Actions.TOGGLE_FOLDER_COLLAPSE, { id: folderId, platform: _platform });
          await _refreshTree();
          break;

        case 'rename': {
          const currentFolder = _findFolderInTree(folderId);
          const newName = await Modal.prompt(_shadowRoot, {
            title: i18n.t('rename'),
            defaultValue: currentFolder?.name || '',
            placeholder: '文件夹名称'
          });
          if (newName !== null && newName !== '') {
            await MessageBus.send(MessageBus.Actions.RENAME_FOLDER, { id: folderId, name: newName, platform: _platform });
            await _refreshTree();
          }
          break;
        }

        case 'addSubfolder': {
          const name = await Modal.prompt(_shadowRoot, {
            title: i18n.t('addSubfolder'),
            placeholder: '子文件夹名称'
          });
          if (name !== null && name !== '') {
            await MessageBus.send(MessageBus.Actions.CREATE_FOLDER, { name, platform: _platform, parentId: folderId });
            await _refreshTree();
          }
          break;
        }

        case 'setColor': {
          const picked = await Modal.prompt(_shadowRoot, {
            title: i18n.t('setColor'),
            defaultValue: data || '#4a90d9',
            placeholder: '颜色代码 (如 #4a90d9)'
          });
          if (picked !== null) {
            await MessageBus.send(MessageBus.Actions.SET_FOLDER_COLOR, {
              id: folderId,
              color: picked || null,
              platform: _platform
            });
            await _refreshTree();
          }
          break;
        }

        case 'delete': {
          const confirmed = await Modal.confirm(_shadowRoot, {
            title: i18n.t('delete'),
            message: i18n.t('confirmDeleteFolder', data || ''),
            danger: true,
            confirmText: i18n.t('delete'),
            cancelText: '取消'
          });
          if (confirmed) {
            await MessageBus.send(MessageBus.Actions.DELETE_FOLDER, { id: folderId, platform: _platform });
            Toast.show(_shadowRoot, '文件夹已删除', 'success');
            await _refreshTree();
          }
          break;
        }
      }
    } catch (err) {
      Toast.show(_shadowRoot, '操作失败: ' + err.message, 'error');
    }
  }

  async function _handleCreateFolder() {
    try {
      const name = await Modal.prompt(_shadowRoot, {
        title: i18n.t('newFolder'),
        placeholder: '文件夹名称'
      });
      if (name !== null && name !== '') {
        await MessageBus.send(MessageBus.Actions.CREATE_FOLDER, { name, platform: _platform, parentId: null });
        Toast.show(_shadowRoot, '文件夹已创建', 'success');
        // 刷新树形数据
        await _refreshTree();
      }
    } catch (err) {
      console.error('[汇聊] Create folder error:', err);
      Toast.show(_shadowRoot, '创建失败: ' + err.message, 'error');
    }
  }

  // === Conversation Actions ===
  function _handleConversationContextMenu(conv, event) {
    ContextMenu.show(_shadowRoot, event.clientX, event.clientY, [
      { label: i18n.t('openConversation'), icon: 'externalLink', action: () => _handleConversationClick(conv) },
      { label: conv.isPinned ? i18n.t('unpin') : i18n.t('pin'), icon: 'pin', action: () => _handleConversationAction('togglePin', conv) },
      'separator',
      { label: i18n.t('moveToFolder'), icon: 'folder', action: () => _handleConversationAction('moveToFolder', conv) },
      ...(conv.folderId ? [{ label: i18n.t('removeFromFolder'), icon: 'close', action: () => _handleConversationAction('removeFromFolder', conv) }] : []),
    ]);
  }

  async function _handleConversationAction(action, conv) {
    try {
      switch (action) {
        case 'open':
          _handleConversationClick(conv);
          break;

        case 'togglePin':
          await MessageBus.send(MessageBus.Actions.TOGGLE_PIN, { conversationId: conv.id, platform: _platform });
          Toast.show(_shadowRoot, conv.isPinned ? '已取消置顶' : '已置顶', 'success');
          break;

        case 'moveToFolder': {
          if (_treeData && _treeData.tree.length > 0) {
            const folderNames = _flattenFolderNames(_treeData.tree);
            const items = folderNames.map(f => ({
              label: f.prefix + f.name,
              icon: 'folder',
              action: async () => {
                await MessageBus.send(MessageBus.Actions.MOVE_CONVERSATION, {
                  conversationId: conv.id,
                  folderId: f.id,
                  platform: _platform
                });
                Toast.show(_shadowRoot, `已移动到「${f.name}」`, 'success');
              }
            }));
            ContextMenu.show(_shadowRoot, 200, 200, items);
          } else {
            Toast.show(_shadowRoot, '请先创建文件夹', 'info');
          }
          break;
        }

        case 'removeFromFolder':
          await MessageBus.send(MessageBus.Actions.REMOVE_FROM_FOLDER, { conversationId: conv.id, platform: _platform });
          Toast.show(_shadowRoot, '已移出文件夹', 'success');
          break;
      }
    } catch (err) {
      Toast.show(_shadowRoot, '操作失败: ' + err.message, 'error');
    }
  }

  function _handleConversationClick(conv) {
    if (conv.url) {
      window.location.href = conv.url;
    }
  }

  // === Helpers ===
  function _findFolderInTree(folderId) {
    if (!_treeData) return null;
    const search = (nodes) => {
      for (const node of nodes) {
        if (node.id === folderId) return node;
        if (node.children) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return search(_treeData.tree || []);
  }

  function _flattenFolderNames(nodes, depth = 0) {
    const result = [];
    for (const node of nodes) {
      result.push({
        id: node.id,
        name: node.name,
        prefix: '  '.repeat(depth)
      });
      if (node.children) {
        result.push(..._flattenFolderNames(node.children, depth + 1));
      }
    }
    return result;
  }

  function _toggleCollapse() {
    if (!_panelEl) return;
    const isCollapsed = _panelEl.classList.toggle('acf-panel--collapsed');
    // Update toggle button icon
    const toggleBtn = _panelEl.querySelector('.acf-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = '';
      toggleBtn.appendChild(SVGIcons.createIcon(isCollapsed ? 'chevronRight' : 'chevronDown', 14));
    }
  }

  /**
   * Update the sidebar with fresh conversation scan data.
   */
  function updateConversations() {
    _refreshTree();
  }

  return { init, updateConversations };
})();
