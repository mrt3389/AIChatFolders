/**
 * Popup Logic — handles all popup UI interactions.
 */
(async function () {
  'use strict';

  const { Actions } = MessageBus;

  // === Tab Navigation ===
  const tabs = document.querySelectorAll('.popup-tab');
  const panels = document.querySelectorAll('.popup-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('popup-tab--active'));
      panels.forEach(p => p.classList.remove('popup-panel--active'));
      tab.classList.add('popup-tab--active');
      const panel = document.querySelector(`[data-panel="${tab.dataset.tab}"]`);
      if (panel) panel.classList.add('popup-panel--active');
    });
  });

  // === Version ===
  document.getElementById('version').textContent = 'v' + browserAPI.runtime.getManifest().version;

  // === Load Settings ===
  let settings;
  try {
    settings = await MessageBus.send(Actions.GET_SETTINGS);
  } catch (e) {
    settings = { theme: 'auto', enabledPlatforms: ['doubao', 'kimi', 'deepseek'], confirmBeforeDelete: true };
  }

  // Populate settings UI
  document.getElementById('setting-theme').value = settings.theme || 'auto';
  document.getElementById('setting-confirm-delete').checked = settings.confirmBeforeDelete !== false;

  const platforms = settings.enabledPlatforms || ['doubao', 'kimi', 'deepseek'];
  document.getElementById('platform-deepseek').checked = platforms.includes('deepseek');
  document.getElementById('platform-kimi').checked = platforms.includes('kimi');
  document.getElementById('platform-doubao').checked = platforms.includes('doubao');

  // === Settings Change Handlers ===
  const saveSettings = async (partial) => {
    try {
      settings = await MessageBus.send(Actions.UPDATE_SETTINGS, partial);
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  };

  document.getElementById('setting-theme').addEventListener('change', (e) => {
    saveSettings({ theme: e.target.value });
  });

  document.getElementById('setting-confirm-delete').addEventListener('change', (e) => {
    saveSettings({ confirmBeforeDelete: e.target.checked });
  });

  // Platform checkboxes
  ['deepseek', 'kimi', 'doubao'].forEach(p => {
    document.getElementById(`platform-${p}`).addEventListener('change', () => {
      const enabled = [];
      if (document.getElementById('platform-deepseek').checked) enabled.push('deepseek');
      if (document.getElementById('platform-kimi').checked) enabled.push('kimi');
      if (document.getElementById('platform-doubao').checked) enabled.push('doubao');
      saveSettings({ enabledPlatforms: enabled });
    });
  });

  // === Load Folder Tree ===
  async function loadFolderTree() {
    try {
      const data = await MessageBus.send(Actions.GET_FOLDER_TREE);
      renderFolderList(data);
      updateStats(data);
    } catch (e) {
      document.getElementById('folder-list').innerHTML = '<div class="popup-empty">加载失败</div>';
    }
  }

  function renderFolderList(data) {
    const container = document.getElementById('folder-list');
    container.innerHTML = '';

    if (!data.tree || data.tree.length === 0) {
      container.innerHTML = '<div class="popup-empty">暂无文件夹，点击上方"+ 新建"创建</div>';
      return;
    }

    function renderNode(node, depth = 0) {
      const item = document.createElement('div');
      item.className = 'popup-folder-item';

      // Indent
      for (let i = 0; i < depth; i++) {
        const indent = document.createElement('span');
        indent.className = 'popup-folder-item__indent';
        item.appendChild(indent);
      }

      // Color dot
      const colorDot = document.createElement('span');
      colorDot.className = 'popup-folder-item__color';
      colorDot.style.backgroundColor = node.color || '#4a90d9';
      item.appendChild(colorDot);

      // Name
      const name = document.createElement('span');
      name.className = 'popup-folder-item__name';
      name.textContent = node.name;
      item.appendChild(name);

      // Count
      const count = countConversations(node);
      const countEl = document.createElement('span');
      countEl.className = 'popup-folder-item__count';
      countEl.textContent = count > 0 ? count : '';
      item.appendChild(countEl);

      container.appendChild(item);

      // Render children
      if (node.children) {
        for (const child of node.children) {
          renderNode(child, depth + 1);
        }
      }
    }

    for (const node of data.tree) {
      renderNode(node);
    }
  }

  function countConversations(node) {
    let count = (node.conversations || []).length;
    for (const child of (node.children || [])) {
      count += countConversations(child);
    }
    return count;
  }

  function updateStats(data) {
    const allFolders = [];
    function collectFolders(nodes) {
      for (const n of nodes) {
        allFolders.push(n);
        if (n.children) collectFolders(n.children);
      }
    }
    collectFolders(data.tree || []);

    document.getElementById('stat-folders').textContent = allFolders.length;

    const totalConversations = (data.pinned || []).length +
      (data.unfiled || []).length +
      allFolders.reduce((sum, f) => sum + (f.conversations || []).length, 0);
    document.getElementById('stat-conversations').textContent = totalConversations;
    document.getElementById('stat-pinned').textContent = (data.pinned || []).length;
  }

  // === New Folder ===
  document.getElementById('btn-new-folder').addEventListener('click', async () => {
    const name = prompt('请输入文件夹名称:');
    if (name && name.trim()) {
      try {
        await MessageBus.send(Actions.CREATE_FOLDER, { name: name.trim(), parentId: null });
        await loadFolderTree();
      } catch (e) {
        alert('创建失败: ' + e.message);
      }
    }
  });

  // === Search ===
  let searchTimer = null;
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const platformFilter = document.getElementById('search-platform-filter');

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(doSearch, 300);
  });

  platformFilter.addEventListener('change', doSearch);

  async function doSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      searchResults.innerHTML = '<div class="popup-empty">输入关键词开始搜索</div>';
      return;
    }

    try {
      let results = await MessageBus.send(Actions.SEARCH, { query, limit: 50 });
      const platform = platformFilter.value;
      if (platform) {
        results = results.filter(r => r.platform === platform);
      }
      renderSearchResults(results);
    } catch (e) {
      searchResults.innerHTML = '<div class="popup-empty">搜索失败</div>';
    }
  }

  function renderSearchResults(results) {
    searchResults.innerHTML = '';
    if (!results || results.length === 0) {
      searchResults.innerHTML = '<div class="popup-empty">未找到匹配的对话</div>';
      return;
    }

    for (const conv of results) {
      const item = document.createElement('div');
      item.className = 'popup-search-result';
      item.addEventListener('click', () => {
        if (conv.url) {
          browserAPI.tabs.create({ url: conv.url });
        }
      });

      const title = document.createElement('span');
      title.className = 'popup-search-result__title';
      title.textContent = conv.title || '(无标题)';
      item.appendChild(title);

      const badgeText = { deepseek: 'DS', kimi: 'Kimi', doubao: '豆包' }[conv.platform] || conv.platform;
      const badge = document.createElement('span');
      badge.className = `popup-search-result__badge popup-search-result__badge--${conv.platform}`;
      badge.textContent = badgeText;
      item.appendChild(badge);

      searchResults.appendChild(item);
    }
  }

  // === Export ===
  document.getElementById('btn-export').addEventListener('click', async () => {
    const statusEl = document.getElementById('sync-status');
    try {
      const data = await MessageBus.send(Actions.EXPORT_DATA);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-chat-folders-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      statusEl.style.display = 'block';
      statusEl.className = 'popup-sync-status popup-sync-status--success';
      statusEl.textContent = '导出成功！';
    } catch (e) {
      statusEl.style.display = 'block';
      statusEl.className = 'popup-sync-status popup-sync-status--error';
      statusEl.textContent = '导出失败: ' + e.message;
    }
  });

  // === Import ===
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('sync-status');
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const result = await MessageBus.send(Actions.IMPORT_DATA, { jsonData });

      statusEl.style.display = 'block';
      statusEl.className = 'popup-sync-status popup-sync-status--success';
      statusEl.textContent = `导入成功！文件夹: ${result.foldersImported}, 对话: ${result.conversationsImported}`;

      await loadFolderTree();
    } catch (err) {
      statusEl.style.display = 'block';
      statusEl.className = 'popup-sync-status popup-sync-status--error';
      statusEl.textContent = '导入失败: ' + err.message;
    }

    // Reset file input
    e.target.value = '';
  });

  // === Clear Data ===
  document.getElementById('btn-clear-data').addEventListener('click', async () => {
    if (!confirm('确定要清除所有数据吗？此操作不可恢复！\n\n建议先导出备份。')) return;
    if (!confirm('再次确认：这将删除所有文件夹和对话记录映射。继续？')) return;

    try {
      // Clear all IndexedDB stores
      const request = indexedDB.deleteDatabase('AIChatFoldersDB');
      request.onsuccess = async () => {
        document.getElementById('sync-status').style.display = 'block';
        document.getElementById('sync-status').className = 'popup-sync-status popup-sync-status--success';
        document.getElementById('sync-status').textContent = '数据已清除。刷新页面以重新初始化。';
        await loadFolderTree();
      };
      request.onerror = () => {
        throw new Error('Failed to delete database');
      };
    } catch (e) {
      alert('清除失败: ' + e.message);
    }
  });

  // === Initial Load ===
  await loadFolderTree();
})();
