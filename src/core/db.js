/**
 * IndexedDB wrapper for AIChatFoldersDB.
 * Provides Promise-based CRUD and schema management.
 */
const DB = (() => {
  const DB_NAME = 'AIChatFoldersDB';
  const DB_VERSION = 2; // Bump version for platform field
  let _db = null;

  /**
   * Open (or create) the database with proper schema.
   * @returns {Promise<IDBDatabase>}
   */
  function open() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // folders store
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
          folderStore.createIndex('order', 'order', { unique: false });
          folderStore.createIndex('parentId_order', ['parentId', 'order'], { unique: false });
          folderStore.createIndex('platform', 'platform', { unique: false });
        } else {
          // Migration: Add platform index if missing
          const folderStore = event.target.transaction.objectStore('folders');
          if (!folderStore.indexNames.contains('platform')) {
            folderStore.createIndex('platform', 'platform', { unique: false });
          }
        }

        // conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('platformId', 'platformId', { unique: false });
          convStore.createIndex('platform', 'platform', { unique: false });
          convStore.createIndex('folderId', 'folderId', { unique: false });
          convStore.createIndex('isPinned', 'isPinned', { unique: false });
          convStore.createIndex('platform_platformId', ['platform', 'platformId'], { unique: true });
          convStore.createIndex('folderId_orderInFolder', ['folderId', 'orderInFolder'], { unique: false });
        }

        // searchIndex store
        if (!db.objectStoreNames.contains('searchIndex')) {
          const searchStore = db.createObjectStore('searchIndex', { keyPath: 'conversationId' });
          searchStore.createIndex('tokens', 'tokens', { unique: false, multiEntry: true });
          searchStore.createIndex('titleLower', 'titleLower', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        _db = event.target.result;
        _db.onclose = () => { _db = null; };
        resolve(_db);
      };

      request.onerror = (event) => {
        reject(new Error('Failed to open IndexedDB: ' + event.target.error));
      };
    });
  }

  /**
   * Get a transaction and object store.
   * @param {string} storeName
   * @param {IDBTransactionMode} mode - 'readonly' | 'readwrite'
   * @returns {Promise<{tx: IDBTransaction, store: IDBObjectStore}>}
   */
  async function getStore(storeName, mode = 'readonly') {
    const db = await open();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { tx, store };
  }

  /**
   * Put (upsert) a record into a store.
   * @param {string} storeName
   * @param {Object} record
   * @returns {Promise<IDBValidKey>}
   */
  async function put(storeName, record) {
    const { store } = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get a record by primary key.
   * @param {string} storeName
   * @param {IDBValidKey} key
   * @returns {Promise<Object|undefined>}
   */
  async function get(storeName, key) {
    const { store } = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all records from a store.
   * @param {string} storeName
   * @returns {Promise<Object[]>}
   */
  async function getAll(storeName) {
    const { store } = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Query records using an index.
   * @param {string} storeName
   * @param {string} indexName
   * @param {IDBValidKey|IDBKeyRange} query
   * @returns {Promise<Object[]>}
   */
  async function queryByIndex(storeName, indexName, query) {
    const { store } = await getStore(storeName, 'readonly');
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const req = index.getAll(query);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete a record by primary key.
   * @param {string} storeName
   * @param {IDBValidKey} key
   * @returns {Promise<void>}
   */
  async function remove(storeName, key) {
    const { store } = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete all records in a store.
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async function clear(storeName) {
    const { store } = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Run a batch of operations in a single transaction.
   * @param {string} storeName
   * @param {Function} callback - receives the store, should return array of requests
   * @returns {Promise<void>}
   */
  async function batch(storeName, callback) {
    const { tx, store } = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      callback(store);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  /**
   * Close the database connection.
   */
  function close() {
    if (_db) {
      _db.close();
      _db = null;
    }
  }

  return { open, put, get, getAll, queryByIndex, remove, clear, batch, close };
})();
