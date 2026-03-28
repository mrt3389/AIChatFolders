/**
 * Folder Manager — CRUD operations and tree building for folders.
 * All folders are platform-specific for isolation.
 */
const FolderManager = (() => {
  /**
   * Create a new folder for a specific platform.
   * @param {string} name
   * @param {string} platform - "doubao"|"kimi"|"deepseek"
   * @param {string|null} parentId
   * @param {string|null} color
   * @returns {Promise<Object>} the created folder
   */
  async function createFolder(name, platform, parentId = null, color = null) {
    // Calculate next order value for this platform and parent
    const allFolders = await DB.getAll('folders');
    const platformFolders = allFolders.filter(f => f.platform === platform);
    const siblings = platformFolders.filter(f => f.parentId === parentId);
    const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order || 0), 0);

    const folder = {
      id: generateUUID(),
      name: name.trim(),
      platform,
      parentId,
      order: maxOrder + 1,
      color,
      isCollapsed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await DB.put('folders', folder);
    return folder;
  }

  /**
   * Rename a folder.
   * @param {string} id
   * @param {string} newName
   * @returns {Promise<Object>}
   */
  async function renameFolder(id, newName) {
    const folder = await DB.get('folders', id);
    if (!folder) throw new Error('Folder not found: ' + id);
    folder.name = newName.trim();
    folder.updatedAt = Date.now();
    await DB.put('folders', folder);
    return folder;
  }

  /**
   * Move a folder to a new parent.
   * @param {string} id
   * @param {string|null} newParentId
   * @param {number} [newOrder]
   * @returns {Promise<Object>}
   */
  async function moveFolder(id, newParentId, newOrder) {
    // Prevent circular reference
    if (newParentId) {
      let current = newParentId;
      while (current) {
        if (current === id) throw new Error('Cannot move folder into its own descendant');
        const parent = await DB.get('folders', current);
        current = parent ? parent.parentId : null;
      }
    }

    const folder = await DB.get('folders', id);
    if (!folder) throw new Error('Folder not found: ' + id);

    folder.parentId = newParentId;
    if (newOrder !== undefined) {
      folder.order = newOrder;
    } else {
      const siblings = await DB.queryByIndex('folders', 'parentId', newParentId);
      const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order || 0), 0);
      folder.order = maxOrder + 1;
    }
    folder.updatedAt = Date.now();
    await DB.put('folders', folder);
    return folder;
  }

  /**
   * Delete a folder. Conversations inside are moved to unfiled.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async function deleteFolder(id) {
    // Move conversations to unfiled
    const conversations = await DB.queryByIndex('conversations', 'folderId', id);
    for (const conv of conversations) {
      conv.folderId = null;
      conv.orderInFolder = 0;
      conv.updatedAt = Date.now();
      await DB.put('conversations', conv);
    }

    // Move subfolders to parent of deleted folder
    const folder = await DB.get('folders', id);
    const subfolders = await DB.queryByIndex('folders', 'parentId', id);
    for (const sub of subfolders) {
      sub.parentId = folder ? folder.parentId : null;
      sub.updatedAt = Date.now();
      await DB.put('folders', sub);
    }

    await DB.remove('folders', id);
  }

  /**
   * Set folder color.
   * @param {string} id
   * @param {string|null} color
   * @returns {Promise<Object>}
   */
  async function setColor(id, color) {
    const folder = await DB.get('folders', id);
    if (!folder) throw new Error('Folder not found: ' + id);
    folder.color = color;
    folder.updatedAt = Date.now();
    await DB.put('folders', folder);
    return folder;
  }

  /**
   * Toggle folder collapsed state.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async function toggleCollapse(id) {
    const folder = await DB.get('folders', id);
    if (!folder) throw new Error('Folder not found: ' + id);
    folder.isCollapsed = !folder.isCollapsed;
    await DB.put('folders', folder);
    return folder;
  }

  /**
   * Reorder folders within a parent.
   * @param {string|null} parentId
   * @param {string[]} orderedIds - folder IDs in desired order
   * @returns {Promise<void>}
   */
  async function reorderFolders(parentId, orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      const folder = await DB.get('folders', orderedIds[i]);
      if (folder) {
        folder.order = i + 1;
        folder.updatedAt = Date.now();
        await DB.put('folders', folder);
      }
    }
  }

  /**
   * Build the folder tree from flat records for a specific platform.
   * @param {string} platform - "doubao"|"kimi"|"deepseek"
   * @returns {Promise<Object>} { tree: TreeNode[], flatMap: { [id]: folder }, unfiled: [], pinned: [] }
   */
  async function getFolderTree(platform) {
    const allFolders = await DB.getAll('folders');
    const allConversations = await DB.getAll('conversations');
  
    // Filter by platform
    const platformFolders = allFolders.filter(f => f.platform === platform);
    const platformConversations = allConversations.filter(c => c.platform === platform);
  
    // Build flat map
    const flatMap = {};
    for (const f of platformFolders) {
      flatMap[f.id] = { ...f, children: [], conversations: [] };
    }
  
    // Assign conversations to folders (only for this platform)
    for (const conv of platformConversations) {
      if (conv.folderId && flatMap[conv.folderId]) {
        flatMap[conv.folderId].conversations.push(conv);
      }
    }
  
    // Sort conversations within each folder
    for (const id of Object.keys(flatMap)) {
      flatMap[id].conversations.sort((a, b) => (a.orderInFolder || 0) - (b.orderInFolder || 0));
    }
  
    // Build tree (only for this platform's folders)
    const tree = [];
    for (const f of platformFolders) {
      if (f.parentId && flatMap[f.parentId]) {
        flatMap[f.parentId].children.push(flatMap[f.id]);
      } else if (!f.parentId) {
        tree.push(flatMap[f.id]);
      } else {
        // Orphaned folder (parent deleted), treat as root
        tree.push(flatMap[f.id]);
      }
    }

    // Sort children at each level
    const sortChildren = (nodes) => {
      nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
      for (const node of nodes) {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      }
    };
    sortChildren(tree);

    // Collect unfiled and pinned conversations for this platform only
    const unfiled = platformConversations
      .filter(c => !c.folderId)
      .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));

    const pinned = platformConversations
      .filter(c => c.isPinned)
      .sort((a, b) => (a.pinOrder || 0) - (b.pinOrder || 0));

    return { tree, flatMap, unfiled, pinned };
  }

  return {
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    setColor,
    toggleCollapse,
    reorderFolders,
    getFolderTree
  };
})();
