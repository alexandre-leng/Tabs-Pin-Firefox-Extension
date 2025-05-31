/**
 * Tabs Pin Background Script for Firefox
 * Handles core extension functionality and tab management
 */

'use strict';

class TabsPinBackground {
  constructor() {
    this.tabs = [];
    this.categories = [];
    this.settings = { autoOpenTabs: false };
    this.init();
  }

  async init() {
    try {
      // Load initial data
      await this.loadData();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('TabsPin background script initialized');
    } catch (error) {
      console.error('Failed to initialize background script:', error);
    }
  }

  async loadData() {
    try {
      const result = await browser.storage.local.get(['pinnedTabs', 'categories', 'settings']);
      
      this.tabs = result.pinnedTabs || [];
      this.categories = result.categories || this.getDefaultCategories();
      this.settings = { autoOpenTabs: false, ...result.settings };
      
    } catch (error) {
      console.error('Error loading background data:', error);
      throw error;
    }
  }

  getDefaultCategories() {
    return [
      { id: 'work', name: browser.i18n.getMessage('work') || 'Work', icon: '💼' },
      { id: 'personal', name: browser.i18n.getMessage('personal') || 'Personal', icon: '👤' },
      { id: 'development', name: browser.i18n.getMessage('development') || 'Development', icon: '💻' },
      { id: 'social', name: browser.i18n.getMessage('social') || 'Social', icon: '🌐' },
      { id: 'tools', name: browser.i18n.getMessage('tools') || 'Tools', icon: '🔧' },
      { id: 'entertainment', name: browser.i18n.getMessage('entertainment') || 'Entertainment', icon: '🎮' }
    ];
  }

  setupEventListeners() {
    // Message listener for popup communications
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      return this.handleMessage(request, sender, sendResponse);
    });

    // Window creation listener for auto-open functionality
    if (browser.windows && browser.windows.onCreated) {
      browser.windows.onCreated.addListener((window) => {
        this.handleWindowCreated(window);
      });
    }

    // Installation and startup listeners
    browser.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });

    browser.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      let result;
      
      switch (request.action) {
        case 'openAllTabs':
          result = await this.openAllTabs(request.windowId);
          break;
          
        case 'openCategoryTabs':
          result = await this.openCategoryTabs(request.categoryId, request.windowId);
          break;
          
        case 'updateSettings':
          result = await this.updateSettings(request.settings);
          break;
          
        case 'getTabsData':
          await this.loadData();
          result = {
            success: true,
            data: {
              tabs: this.tabs,
              categories: this.categories,
              settings: this.settings
            }
          };
          break;
          
        case 'saveTab':
          result = await this.saveTab(request.tab);
          break;
          
        case 'deleteTab':
          result = await this.deleteTab(request.tabId);
          break;
          
        case 'updateTab':
          result = await this.updateTab(request.tab);
          break;
          
        case 'saveCategories':
          result = await this.saveCategories(request.categories);
          break;
          
        default:
          console.warn('Unknown action:', request.action);
          result = { success: false, error: 'Unknown action' };
      }
      
      return result;
    } catch (error) {
      console.error('Error handling message:', error);
      return { success: false, error: error.message };
    }
  }

  async openAllTabs(windowId = null) {
    try {
      if (this.tabs.length === 0) {
        return { success: false, error: 'No tabs configured' };
      }

      // Sort tabs by order before opening
      const sortedTabs = [...this.tabs].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0);
      });
      
      // Get tabs from specific window if provided, otherwise all tabs
      const queryOptions = windowId ? { windowId: windowId } : {};
      const existingTabs = await browser.tabs.query(queryOptions);
      
      // Helper function to normalize URLs for comparison
      const normalizeUrl = (url) => {
        try {
          const urlObj = new URL(url);
          return urlObj.origin + urlObj.pathname.replace(/\/$/, '') + urlObj.search;
        } catch (error) {
          return url;
        }
      };
      
      // Find tabs that are already open and pinned
      const tabsToOpen = [];
      const alreadyOpenTabs = [];
      
      for (const tab of sortedTabs) {
        if (tab.enabled === false) continue;
        
        const normalizedConfigUrl = normalizeUrl(tab.url);
        const isAlreadyOpen = existingTabs.some(existingTab => {
          if (!existingTab.pinned) return false;
          const normalizedExistingUrl = normalizeUrl(existingTab.url);
          return normalizedExistingUrl === normalizedConfigUrl;
        });
        
        if (isAlreadyOpen) {
          alreadyOpenTabs.push(tab);
        } else {
          tabsToOpen.push(tab);
        }
      }
      
      // If all tabs are already open, return early with special message
      if (tabsToOpen.length === 0) {
        return {
          success: true,
          allAlreadyOpen: true,
          skipped: alreadyOpenTabs.length,
          opened: 0,
          message: 'allTabsAlreadyOpen'
        };
      }
      
      // Open only the tabs that are not already open, in order
      const results = [];
      for (const tab of tabsToOpen) {
        try {
          const createOptions = {
            url: tab.url,
            pinned: true,
            active: false
          };
          
          // If a specific window is provided, create tabs in that window
          if (windowId) {
            createOptions.windowId = windowId;
          }
          
          const newTab = await browser.tabs.create(createOptions);
          
          results.push({ success: true, tab: newTab, config: tab });
        } catch (error) {
          console.error(`Failed to open tab ${tab.url}:`, error);
          results.push({ success: false, error: error.message, config: tab });
        }
      }

      // Update last opened timestamp
      this.settings.lastOpened = new Date().toISOString();
      await browser.storage.local.set({ settings: this.settings });

      const opened = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: true,
        results: results,
        opened: opened,
        failed: failed,
        skipped: alreadyOpenTabs.length,
        message: alreadyOpenTabs.length > 0 ? 'someTabsAlreadyOpen' : null
      };
    } catch (error) {
      console.error('Error opening all tabs:', error);
      return { success: false, error: error.message };
    }
  }

  async openCategoryTabs(categoryId, windowId = null) {
    try {
      // Get all tabs in category and sort by order
      const categoryTabs = this.tabs.filter(tab => 
        tab.category === categoryId && tab.enabled !== false
      ).sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0);
      });

      if (categoryTabs.length === 0) {
        return { success: false, error: 'No tabs in this category' };
      }

      // Get tabs from specific window if provided, otherwise all tabs
      const queryOptions = windowId ? { windowId: windowId } : {};
      const existingTabs = await browser.tabs.query(queryOptions);
      
      // Helper function to normalize URLs for comparison
      const normalizeUrl = (url) => {
        try {
          const urlObj = new URL(url);
          return urlObj.origin + urlObj.pathname.replace(/\/$/, '') + urlObj.search;
        } catch (error) {
          return url;
        }
      };
      
      // Find tabs that are already open and pinned
      const tabsToOpen = [];
      const alreadyOpenTabs = [];
      
      for (const tab of categoryTabs) {
        const normalizedConfigUrl = normalizeUrl(tab.url);
        const isAlreadyOpen = existingTabs.some(existingTab => {
          if (!existingTab.pinned) return false;
          const normalizedExistingUrl = normalizeUrl(existingTab.url);
          return normalizedExistingUrl === normalizedConfigUrl;
        });
        
        if (isAlreadyOpen) {
          alreadyOpenTabs.push(tab);
        } else {
          tabsToOpen.push(tab);
        }
      }
      
      // If all tabs are already open, return early with special message
      if (tabsToOpen.length === 0) {
        return {
          success: true,
          allAlreadyOpen: true,
          skipped: alreadyOpenTabs.length,
          opened: 0,
          message: 'allTabsAlreadyOpen'
        };
      }
      
      // Open only the tabs that are not already open, in order
      const results = [];
      for (const tab of tabsToOpen) {
        try {
          const createOptions = {
            url: tab.url,
            pinned: true,
            active: false
          };
          
          // If a specific window is provided, create tabs in that window
          if (windowId) {
            createOptions.windowId = windowId;
          }
          
          const newTab = await browser.tabs.create(createOptions);
          
          results.push({ success: true, tab: newTab, config: tab });
        } catch (error) {
          console.error(`Failed to open category tab ${tab.url}:`, error);
          results.push({ success: false, error: error.message, config: tab });
        }
      }

      const opened = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: true,
        results: results,
        opened: opened,
        failed: failed,
        skipped: alreadyOpenTabs.length,
        message: alreadyOpenTabs.length > 0 ? 'someTabsAlreadyOpen' : null
      };
    } catch (error) {
      console.error('Error opening category tabs:', error);
      return { success: false, error: error.message };
    }
  }

  async saveTab(tab) {
    try {
      // Validate tab data
      if (!tab.url || !this.isValidUrl(tab.url)) {
        throw new Error('Invalid URL');
      }

      // Generate ID if not provided
      if (!tab.id) {
        tab.id = this.generateTabId();
      }

      // Set default values
      tab.dateAdded = tab.dateAdded || new Date().toISOString();
      tab.enabled = tab.enabled !== false;
      tab.category = tab.category || this.categories[0]?.id || 'work';

      // Add or update tab
      const existingIndex = this.tabs.findIndex(t => t.id === tab.id);
      if (existingIndex >= 0) {
        this.tabs[existingIndex] = { ...this.tabs[existingIndex], ...tab };
      } else {
        this.tabs.push(tab);
      }

      // Save to storage
      await browser.storage.local.set({ pinnedTabs: this.tabs });
      
      // Notify other parts of the extension about the change
      this.notifyDataChange('tabsChanged');
      
      console.log('Tab saved:', tab.title || tab.url);
      return { success: true, tab: tab };
    } catch (error) {
      console.error('Error saving tab:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTab(tabId) {
    try {
      const initialLength = this.tabs.length;
      this.tabs = this.tabs.filter(tab => tab.id !== tabId);
      
      if (this.tabs.length === initialLength) {
        throw new Error('Tab not found');
      }

      await browser.storage.local.set({ pinnedTabs: this.tabs });
      
      // Notify other parts of the extension about the change
      this.notifyDataChange('tabsChanged');
      
      console.log('Tab deleted:', tabId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting tab:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTab(tab) {
    return await this.saveTab(tab);
  }

  async saveCategories(categories) {
    try {
      // Validate categories
      if (!Array.isArray(categories)) {
        throw new Error('Categories must be an array');
      }

      for (const category of categories) {
        if (!category.id || !category.name || !category.icon) {
          throw new Error('Invalid category data');
        }
      }

      this.categories = categories;
      await browser.storage.local.set({ categories: this.categories });
      
      // Notify other parts of the extension about the change
      this.notifyDataChange('categoriesChanged');
      
      console.log('Categories saved:', categories.length);
      return { success: true, categories: this.categories };
    } catch (error) {
      console.error('Error saving categories:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSettings(settings) {
    try {
      this.settings = { ...this.settings, ...settings };
      await browser.storage.local.set({ settings: this.settings });
      
      // Notify other parts of the extension about the change
      this.notifyDataChange('settingsChanged');
      
      return { success: true, settings: this.settings };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, error: error.message };
    }
  }

  async handleWindowCreated(window) {
    // Check if auto-open is enabled and it's a normal window
    if (this.settings.autoOpenTabs && window.type === 'normal') {
      try {
        // Ensure tabs are loaded before trying to open them
        await this.loadData();
          
          if (this.tabs.length > 0) {
          await this.openAllTabs(window.id);
        }
    } catch (error) {
        console.error('Error during auto-opening tabs:', error);
      }
    }
  }

  async handleInstalled(details) {
    try {
      console.log('Extension installed/updated:', details.reason);
      
      if (details.reason === 'install') {
        // First installation - initialize with default data
        await this.initializeDefaultData();
      } else if (details.reason === 'update') {
        // Update - migrate data if needed
        await this.migrateData(details.previousVersion);
      }
    } catch (error) {
      console.error('Error handling installation:', error);
    }
  }

  async handleStartup() {
    try {
      console.log('Extension startup');
      await this.loadData();
    } catch (error) {
      console.error('Error handling startup:', error);
    }
  }

  async initializeDefaultData() {
    try {
      // Initialize with translated categories
      const defaultData = {
        pinnedTabs: [],
        categories: this.getDefaultCategories(),
        settings: { autoOpenTabs: false }
      };

      await browser.storage.local.set(defaultData);
      console.log('Default data initialized with translations');
    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }

  async migrateData(previousVersion) {
    try {
      console.log('Migrating data from version:', previousVersion);
      
      // Load current data
      await this.loadData();
      
      // Update categories with translations if they exist
      let needsCategoryUpdate = false;
      const defaultCategories = this.getDefaultCategories();
      
      this.categories = this.categories.map(category => {
        const defaultCategory = defaultCategories.find(dc => dc.id === category.id);
        if (defaultCategory && category.name !== defaultCategory.name) {
          needsCategoryUpdate = true;
          return { ...category, name: defaultCategory.name };
        }
        return category;
      });
      
      if (needsCategoryUpdate) {
        await browser.storage.local.set({ categories: this.categories });
        console.log('Categories updated with translations');
      }
      
      // Add any migration logic here for future versions
      // For now, just ensure all tabs have required fields
      let needsUpdate = false;
      
      this.tabs = this.tabs.map(tab => {
        if (!tab.id) {
          tab.id = this.generateTabId();
          needsUpdate = true;
        }
        if (tab.enabled === undefined) {
          tab.enabled = true;
          needsUpdate = true;
        }
        if (!tab.dateAdded) {
          tab.dateAdded = new Date().toISOString();
          needsUpdate = true;
        }
        return tab;
      });

      if (needsUpdate) {
        await browser.storage.local.set({ pinnedTabs: this.tabs });
        console.log('Data migration completed');
      }
    } catch (error) {
      console.error('Error migrating data:', error);
    }
  }

  // Utility functions
  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  generateTabId() {
    return 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Notify other parts of the extension about data changes
  notifyDataChange(changeType) {
    try {
      // Send message to all extension pages (popup, options) about the change
      browser.runtime.sendMessage({
        action: 'dataChanged',
        changeType: changeType,
        data: {
          tabs: this.tabs,
          categories: this.categories,
          settings: this.settings
        }
      }).catch(() => {
        // Ignore errors if no receivers are listening
        console.log('No receivers for data change notification');
      });
    } catch (error) {
      console.log('Error sending data change notification:', error);
    }
  }
}

// Initialize the background script
try {
const tabsPinBackground = new TabsPinBackground();
} catch (error) {
  console.error('Failed to initialize TabsPinBackground:', error);
}
