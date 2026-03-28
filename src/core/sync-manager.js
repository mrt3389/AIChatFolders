/**
 * Sync Manager — JSON export/import for multi-device data transfer.
 */
const SyncManager = (() => {
  const EXPORT_VERSION = 1;

  /**
   * Export all data as a JSON object.
   * @returns {Promise<Object>}
   */
  async function exportAll() {
    const folders = await DB.getAll('folders');
    const conversations = await DB.getAll('conversations');
    const settings = await SettingsManager.get();

    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      extensionVersion: browserAPI.runtime.getManifest().version,
      data: { folders, conversations, settings }
    };
  }

  /**
   * Export data and trigger a file download.
   * @returns {Promise<void>}
   */
  async function exportToFile() {
    const data = await exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `ai-chat-folders-backup-${dateStr}.json`;

    // Use download API if available (background), otherwise <a> trick
    if (browserAPI.downloads && browserAPI.downloads.download) {
      await browserAPI.downloads.download({ url, filename, saveAs: true });
    } else {
      // Content script / popup fallback
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /**
   * Import data from a JSON object. Merges with existing data.
   * @param {Object} jsonData - parsed JSON export
   * @returns {Promise<{foldersImported: number, conversationsImported: number}>}
   */
  async function importFromJSON(jsonData) {
    // Validate
    if (!jsonData || !jsonData.version || !jsonData.data) {
      throw new Error('Invalid export file format');
    }
    if (jsonData.version > EXPORT_VERSION) {
      throw new Error('Export file version is newer than supported');
    }

    const { folders, conversations, settings } = jsonData.data;
    let foldersImported = 0;
    let conversationsImported = 0;

    // Import folders (upsert by ID, newer wins)
    if (Array.isArray(folders)) {
      for (const folder of folders) {
        const existing = await DB.get('folders', folder.id);
        if (!existing || (folder.updatedAt || 0) > (existing.updatedAt || 0)) {
          await DB.put('folders', folder);
          foldersImported++;
        }
      }
    }

    // Import conversations (upsert by [platform, platformId], newer wins)
    if (Array.isArray(conversations)) {
      for (const conv of conversations) {
        const existing = await DB.queryByIndex(
          'conversations', 'platform_platformId', [conv.platform, conv.platformId]
        );
        if (existing.length === 0) {
          await DB.put('conversations', conv);
          conversationsImported++;
        } else if ((conv.updatedAt || 0) > (existing[0].updatedAt || 0)) {
          // Keep the existing internal ID but update other fields
          const merged = { ...existing[0], ...conv, id: existing[0].id };
          await DB.put('conversations', merged);
          conversationsImported++;
        }
      }
    }

    // Import settings if present
    if (settings) {
      await SettingsManager.update(settings);
    }

    // Rebuild search index after import
    await SearchEngine.rebuildIndex();

    return { foldersImported, conversationsImported };
  }

  return { exportAll, exportToFile, importFromJSON };
})();
