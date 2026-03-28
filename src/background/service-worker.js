/**
 * Background Service Worker — message routing hub.
 * Handles all business logic operations requested by content scripts and popup.
 */

// Import core modules via importScripts (MV3 service worker)
try {
  importScripts(
    '../utils/browser-compat.js',
    '../utils/uuid.js',
    '../core/db.js',
    '../core/message-bus.js',
    '../core/search-engine.js',
    '../core/folder-manager.js',
    '../core/conversation-manager.js',
    '../core/settings-manager.js',
    '../core/sync-manager.js'
  );
} catch (e) {
  console.error('Failed to import scripts:', e);
}

// Initialize database on startup
DB.open().then(() => {
  console.log('[汇聊] Background service worker started');
}).catch(err => {
  console.error('[汇聊] DB open failed:', err);
});

// Handle messages from content scripts and popup
MessageBus.onMessage(async (action, payload, sender) => {
  const { Actions } = MessageBus;

  switch (action) {
    // === Conversation Scanning ===
    case Actions.SCAN_CONVERSATIONS: {
      const { platform, conversations } = payload;
      const tracked = [];
      for (const conv of conversations) {
        const result = await ConversationManager.trackConversation(
          conv.platformId, platform, conv.title, conv.url
        );
        tracked.push(result);
      }
      // Notify all tabs about updated data
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return { tracked: tracked.length };
    }

    // === Folder Operations ===
    case Actions.GET_FOLDER_TREE: {
      const { platform } = payload || {};
      return await FolderManager.getFolderTree(platform);
    }

    case Actions.CREATE_FOLDER: {
      const { name, platform, parentId, color } = payload;
      const folder = await FolderManager.createFolder(name, platform, parentId || null, color || null);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return folder;
    }

    case Actions.RENAME_FOLDER: {
      const { id, name, platform } = payload;
      const folder = await FolderManager.renameFolder(id, name);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return folder;
    }

    case Actions.DELETE_FOLDER: {
      const { id, platform } = payload;
      await FolderManager.deleteFolder(id);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return { success: true };
    }

    case Actions.MOVE_FOLDER: {
      const { id, newParentId, newOrder, platform } = payload;
      const folder = await FolderManager.moveFolder(id, newParentId, newOrder);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return folder;
    }

    case Actions.SET_FOLDER_COLOR: {
      const { id, color, platform } = payload;
      const folder = await FolderManager.setColor(id, color);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return folder;
    }

    case Actions.TOGGLE_FOLDER_COLLAPSE: {
      const folder = await FolderManager.toggleCollapse(payload.id);
      return folder;
    }

    case Actions.REORDER_FOLDERS: {
      const { parentId, orderedIds, platform } = payload;
      await FolderManager.reorderFolders(parentId, orderedIds);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return { success: true };
    }

    // === Conversation Operations ===
    case Actions.MOVE_CONVERSATION: {
      const { conversationId, folderId, order, platform } = payload;
      const conv = await ConversationManager.assignToFolder(conversationId, folderId, order);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return conv;
    }

    case Actions.REMOVE_FROM_FOLDER: {
      const { conversationId, platform } = payload;
      const conv = await ConversationManager.removeFromFolder(conversationId);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return conv;
    }

    case Actions.TOGGLE_PIN: {
      const { conversationId, platform } = payload;
      const conv = await ConversationManager.togglePin(conversationId);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return conv;
    }

    case Actions.BATCH_MOVE: {
      const { conversationIds, folderId, platform } = payload;
      await ConversationManager.batchMoveToFolder(conversationIds, folderId);
      const treeData = await FolderManager.getFolderTree(platform);
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, { platform, treeData });
      return { success: true };
    }

    case Actions.GET_PINNED: {
      return await ConversationManager.getPinned();
    }

    case Actions.GET_UNFILED: {
      return await ConversationManager.getUnfiled();
    }

    // === Search ===
    case Actions.SEARCH: {
      const results = await SearchEngine.search(payload.query, payload.limit);
      return results;
    }

    // === Data Sync ===
    case Actions.EXPORT_DATA: {
      return await SyncManager.exportAll();
    }

    case Actions.IMPORT_DATA: {
      const result = await SyncManager.importFromJSON(payload.jsonData);
      const treeData = await FolderManager.getFolderTree();
      MessageBus.broadcast(Actions.FOLDER_TREE_UPDATED, treeData);
      return result;
    }

    // === Settings ===
    case Actions.GET_SETTINGS: {
      return await SettingsManager.get();
    }

    case Actions.UPDATE_SETTINGS: {
      const settings = await SettingsManager.update(payload);
      MessageBus.broadcast(Actions.SETTINGS_CHANGED, settings);
      return settings;
    }

    // === Health Check ===
    case Actions.PING: {
      return { status: 'alive', timestamp: Date.now() };
    }

    default:
      console.warn('[汇聊] Unknown action:', action);
      return null;
  }
});

// Listen for extension install/update
browserAPI.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[汇聊] Extension installed');
    await DB.open();
    await SettingsManager.load();
  } else if (details.reason === 'update') {
    console.log('[汇聊] Extension updated to', browserAPI.runtime.getManifest().version);
  }
});
