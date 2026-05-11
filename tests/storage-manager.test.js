/**
 * Tests for StorageManager
 * Verifies core logic without browser.storage API.
 */

global.browser = global.browser || {};
browser.storage = {
  local: {
    _store: {},
    async get(keys) {
      return this._store;
    },
    async set(data) {
      Object.assign(this._store, data);
    },
    async clear() {
      this._store = {};
    },
  },
};

const StorageManager = require('../lib/storage-manager.js');

describe('StorageManager', () => {
  let storage;

  beforeEach(() => {
    browser.storage.local._store = {};
    storage = new StorageManager();
  });

  test('initializes with empty cache', () => {
    expect(storage.cache).toBeDefined();
    expect(storage.cache.size).toBe(0);
  });

  test('get returns data from storage', async () => {
    browser.storage.local._store = {
      pinnedTabs: [{ url: 'https://example.com', title: 'Test' }],
      settings: { theme: 'auto' },
    };

    const result = await storage.get(['pinnedTabs', 'settings']);
    expect(result.pinnedTabs).toBeDefined();
    expect(result.settings.theme).toBe('auto');
  });

  test('get caches results', async () => {
    browser.storage.local._store = { test: 'value' };
    await storage.get(['test']);
    await storage.get(['test']);
    expect(storage.cache.size).toBeGreaterThan(0);
  });

  test('set stores data and updates cache', async () => {
    await storage.set({ newKey: 'newValue' });
    expect(browser.storage.local._store.newKey).toBe('newValue');
  });
});
