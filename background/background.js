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
      
      console.log('Background data loaded:', {
        tabs: this.tabs.length,
        categories: this.categories.length,
        settings: this.settings
      });
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
      console.log('Background received message:', request.action);
      
      switch (request.action) {
        case 'openAllTabs':
          return await this.openAllTabs();
          
        case 'openCategoryTabs':
          return await this.openCategoryTabs(request.categoryId);
          
        case 'updateSettings':
          return await this.updateSettings(request.settings);
          
        case 'getTabsData':
          await this.loadData();
          return {
            success: true,
            data: {
              tabs: this.tabs,
              categories: this.categories,
              settings: this.settings
            }
          };
          
        case 'saveTab':
          return await this.saveTab(request.tab);
          
        case 'deleteTab':
          return await this.deleteTab(request.tabId);
          
        case 'updateTab':
          return await this.updateTab(request.tab);
          
        case 'saveCategories':
          return await this.saveCategories(request.categories);
          
        default:
          console.warn('Unknown action:', request.action);
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return { success: false, error: error.message };
    }
  }

  async openAllTabs() {
    try {
      if (this.tabs.length === 0) {
        return { success: false, error: 'No tabs configured' };
      }

      console.log(`Checking ${this.tabs.length} tabs for duplicates`);
      
      // Get all currently open tabs
      const existingTabs = await browser.tabs.query({});
      
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
      
      for (const tab of this.tabs) {
        if (tab.enabled === false) continue;
        
        const normalizedConfigUrl = normalizeUrl(tab.url);
        const isAlreadyOpen = existingTabs.some(existingTab => {
          if (!existingTab.pinned) return false;
          const normalizedExistingUrl = normalizeUrl(existingTab.url);
          return normalizedExistingUrl === normalizedConfigUrl;
        });
        
        if (isAlreadyOpen) {
          alreadyOpenTabs.push(tab);
          console.log(`Tab already open and pinned: ${tab.title || tab.url}`);
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
      
      // Open only the tabs that are not already open
      const results = [];
      for (const tab of tabsToOpen) {
        try {
          const newTab = await browser.tabs.create({
            url: tab.url,
            pinned: true,
            active: false
          });
          
          results.push({ success: true, tab: newTab, config: tab });
          console.log(`Opened tab: ${tab.title || tab.url}`);
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

  async openCategoryTabs(categoryId) {
    try {
      const categoryTabs = this.tabs.filter(tab => 
        tab.category === categoryId && tab.enabled !== false
      );

      if (categoryTabs.length === 0) {
        return { success: false, error: 'No tabs in this category' };
      }

      console.log(`Checking ${categoryTabs.length} tabs from category: ${categoryId} for duplicates`);
      
      // Get all currently open tabs
      const existingTabs = await browser.tabs.query({});
      
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
          console.log(`Category tab already open and pinned: ${tab.title || tab.url}`);
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
      
      // Open only the tabs that are not already open
      const results = [];
      for (const tab of tabsToOpen) {
        try {
          const newTab = await browser.tabs.create({
            url: tab.url,
            pinned: true,
            active: false
          });
          
          results.push({ success: true, tab: newTab, config: tab });
          console.log(`Opened category tab: ${tab.title || tab.url}`);
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
      
      console.log('Settings updated:', this.settings);
      return { success: true, settings: this.settings };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, error: error.message };
    }
  }

  async handleWindowCreated(window) {
    try {
      // Only auto-open for normal windows, not popup or devtools
      if (window.type !== 'normal') {
        return;
      }

      // Check if auto-open is enabled
      if (!this.settings.autoOpenTabs) {
        return;
      }

      // Wait a bit for the window to be fully created
      setTimeout(async () => {
        try {
          await this.loadData(); // Refresh data
          
          if (this.tabs.length > 0) {
            console.log('Auto-opening tabs for new window');
            await this.openAllTabs();
          }
        } catch (error) {
          console.error('Error auto-opening tabs:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error handling window created:', error);
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
const tabsPinBackground = new TabsPinBackground();
