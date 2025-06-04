/**
 * Tabs Pin Background Script for Firefox
 * Handles core extension functionality and tab management
 * Enhanced with Firefox Multi-Account Containers support and robust storage management
 */

'use strict';

class TabsPinBackground {
  constructor() {
    this.tabs = [];
    this.categories = [];
    this.settings = { autoOpenTabs: false };
    // StorageManager est disponible via le manifest.json
    this.storage = new StorageManager();
    // ContainerUtils est disponible via le manifest.json
    this.containerUtils = new ContainerUtils();
    
    // Track initialization state
    this.isInitialized = false;
    this.initializationPromise = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Starting TabsPinBackground initialization...');
      
      // Store the initialization promise
      this.initializationPromise = this.performInitialization();
      await this.initializationPromise;
      
      this.isInitialized = true;
      console.log('✅ TabsPin background script initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize background script:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async performInitialization() {
    // Wait for storage manager to be ready
    const healthCheck = await this.storage.healthCheck();
    console.log('📊 Storage health check:', healthCheck);
    
    // Load initial data
    await this.loadData();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('Container support:', this.containerUtils.containersSupported);
    console.log('Storage system:', healthCheck.healthy ? '✅ Healthy' : '❌ Issues detected');
  }

  async loadData() {
    try {
      const result = await this.storage.get(['pinnedTabs', 'categories', 'settings']);
      
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
      this.handleMessage(request, sender, sendResponse)
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error in message handler:', error);
          sendResponse({ success: false, error: error.message });
        });
      
      // Return true to indicate we will respond asynchronously
      return true;
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

    // Tab listeners for better error handling
    if (browser.tabs.onRemoved) {
      browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
        this.handleTabRemoved(tabId, removeInfo);
      });
    }
  }

  /**
   * Safely checks if a tab exists and is accessible
   * @param {number} tabId - The tab ID to check
   * @returns {Promise<boolean>} - True if tab exists and is accessible
   */
  async isTabValid(tabId) {
    try {
      if (!tabId || typeof tabId !== 'number') {
        return false;
      }
      
      const tab = await browser.tabs.get(tabId);
      return tab !== null && tab !== undefined;
    } catch (error) {
      // Tab doesn't exist or is not accessible
      if (error.message && error.message.includes('Invalid tab ID')) {
        console.warn(`Tab ID ${tabId} is invalid or no longer exists`);
      }
      return false;
    }
  }

  /**
   * Clean up invalid tab references from tracking
   * @param {number} tabId - The invalid tab ID to clean up
   */
  cleanupInvalidTab(tabId) {
    // Remove from any internal tracking if we had such functionality
    console.log(`Cleaned up invalid tab reference: ${tabId}`);
  }

  /**
   * Safely updates a tab with error handling for containers
   * @param {number} tabId - The tab ID to update
   * @param {object} updateProperties - Properties to update
   * @returns {Promise<object>} - Result object with success status
   */
  async safeTabUpdate(tabId, updateProperties) {
    try {
      // First check if tab is valid
      const isValid = await this.isTabValid(tabId);
      if (!isValid) {
        this.cleanupInvalidTab(tabId);
        throw new Error(`Invalid tab ID: ${tabId}`);
      }

      // Use containerUtils for better container handling
      const updatedTab = await this.containerUtils.updateTabWithContainer(tabId, updateProperties);
      return { success: true, tab: updatedTab };
      
    } catch (error) {
      console.error(`Failed to update tab ${tabId}:`, error);
      this.cleanupInvalidTab(tabId);
      return { success: false, error: error.message, tabId };
    }
  }

  handleTabRemoved(tabId, removeInfo) {
    // Clean up any references to removed tabs
    console.log(`Tab ${tabId} was removed, cleaning up references`);
    this.cleanupInvalidTab(tabId);
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      // Wait for initialization to complete if it's still in progress
      if (!this.isInitialized && this.initializationPromise) {
        console.log('⏳ Waiting for background script initialization to complete...');
        try {
          await this.initializationPromise;
        } catch (error) {
          console.error('❌ Background script initialization failed:', error);
          return { success: false, error: 'Background script initialization failed: ' + error.message };
        }
      }
      
      // If still not initialized after waiting, return error
      if (!this.isInitialized) {
        console.error('❌ Background script not initialized, cannot handle message:', request.action);
        return { success: false, error: 'Background script not properly initialized' };
      }
      
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

        case 'ping':
          // Simple ping to check if background script is responsive
          result = { success: true, message: 'pong' };
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
          
          // Special handling for common redirect patterns
          if (urlObj.hostname === 'accounts.google.com' && urlObj.pathname.includes('ServiceLogin')) {
            // For Google authentication redirects, extract the target service
            const continueParam = urlObj.searchParams.get('continue');
            if (continueParam) {
              try {
                const targetUrl = new URL(decodeURIComponent(continueParam));
                // Return the target service domain for comparison
                return targetUrl.origin + targetUrl.pathname.replace(/\/$/, '');
              } catch (e) {
                // If continue param is malformed, use hostname
                return urlObj.hostname;
              }
            }
          }
          
          // For other URLs, normalize by removing query parameters and fragments
          // but keep important path information
          let normalized = urlObj.origin + urlObj.pathname.replace(/\/$/, '');
          
          // Keep important query parameters for some services
          const importantParams = ['view', 'mode', 'hl']; // Add more as needed
          const keptParams = new URLSearchParams();
          importantParams.forEach(param => {
            if (urlObj.searchParams.has(param)) {
              keptParams.set(param, urlObj.searchParams.get(param));
            }
          });
          
          if (keptParams.toString()) {
            normalized += '?' + keptParams.toString();
          }
          
          return normalized.toLowerCase();
        } catch (error) {
          console.warn(`Failed to normalize URL: ${url}`, error);
          return url.toLowerCase();
        }
      };
      
      // Find tabs that are already open (pinned or not)
      const tabsToOpen = [];
      const alreadyOpenTabs = [];
      const tabsToPin = []; // Onglets ouverts mais pas encore épinglés
      
      for (const tab of sortedTabs) {
        if (tab.enabled === false) continue;
        
        const normalizedConfigUrl = normalizeUrl(tab.url);
        const existingTab = existingTabs.find(existingTab => {
          const normalizedExistingUrl = normalizeUrl(existingTab.url);
          return normalizedExistingUrl === normalizedConfigUrl;
        });
        
        if (existingTab) {
          if (existingTab.pinned) {
            // Onglet déjà ouvert ET épinglé
            alreadyOpenTabs.push(tab);
          } else {
            // Onglet ouvert mais pas encore épinglé - on va l'épingler
            tabsToPin.push({ config: tab, existingTab });
          }
        } else {
          // Onglet pas encore ouvert
          tabsToOpen.push(tab);
        }
      }
      
      // Épingler les onglets existants qui ne sont pas encore épinglés
      const pinResults = [];
      for (const { config, existingTab } of tabsToPin) {
        console.log(`Attempting to pin existing tab: ${config.url} (ID: ${existingTab.id})`);
        
        const pinResult = await this.safeTabUpdate(existingTab.id, { pinned: true });
        
        if (pinResult.success) {
          pinResults.push({ success: true, tab: pinResult.tab, config });
          console.log(`Successfully pinned existing tab: ${config.url}`);
        } else {
          console.error(`Failed to pin existing tab ${config.url}:`, pinResult.error);
          pinResults.push({ success: false, error: pinResult.error, config });
        }
      }
      
      // Si tous les onglets sont déjà ouverts (épinglés ou maintenant épinglés), retourner rapidement
      if (tabsToOpen.length === 0) {
        const totalPinned = pinResults.filter(r => r.success).length;
        const totalSkipped = alreadyOpenTabs.length;
        
        return {
          success: true,
          allAlreadyOpen: totalSkipped > 0 && totalPinned === 0,
          skipped: totalSkipped,
          opened: 0,
          pinned: totalPinned,
          message: totalPinned > 0 ? 'someTabsPinned' : 'allTabsAlreadyOpen'
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
          
          // Support for containers if specified in tab config
          if (tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
            createOptions.cookieStoreId = tab.cookieStoreId;
          }
          
          const newTab = await this.containerUtils.createTabWithContainer(createOptions);
          
          results.push({ success: true, tab: newTab, config: tab });
          console.log(`Opened new pinned tab: ${tab.url}`);
        } catch (error) {
          console.error(`Failed to open tab ${tab.url}:`, error);
          results.push({ success: false, error: error.message, config: tab });
        }
      }

      // Update last opened timestamp
      this.settings.lastOpened = new Date().toISOString();
      await this.storage.set({ settings: this.settings });

      const opened = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalPinned = pinResults.filter(r => r.success).length;

      return {
        success: true,
        results: results,
        pinResults: pinResults,
        opened: opened,
        failed: failed,
        skipped: alreadyOpenTabs.length,
        pinned: totalPinned,
        message: alreadyOpenTabs.length > 0 || totalPinned > 0 ? 
          (totalPinned > 0 ? 'someTabsPinnedAndOpened' : 'someTabsAlreadyOpen') : null
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
          
          // Special handling for common redirect patterns
          if (urlObj.hostname === 'accounts.google.com' && urlObj.pathname.includes('ServiceLogin')) {
            // For Google authentication redirects, extract the target service
            const continueParam = urlObj.searchParams.get('continue');
            if (continueParam) {
              try {
                const targetUrl = new URL(decodeURIComponent(continueParam));
                // Return the target service domain for comparison
                return targetUrl.origin + targetUrl.pathname.replace(/\/$/, '');
              } catch (e) {
                // If continue param is malformed, use hostname
                return urlObj.hostname;
              }
            }
          }
          
          // For other URLs, normalize by removing query parameters and fragments
          // but keep important path information
          let normalized = urlObj.origin + urlObj.pathname.replace(/\/$/, '');
          
          // Keep important query parameters for some services
          const importantParams = ['view', 'mode', 'hl']; // Add more as needed
          const keptParams = new URLSearchParams();
          importantParams.forEach(param => {
            if (urlObj.searchParams.has(param)) {
              keptParams.set(param, urlObj.searchParams.get(param));
            }
          });
          
          if (keptParams.toString()) {
            normalized += '?' + keptParams.toString();
          }
          
          return normalized.toLowerCase();
        } catch (error) {
          console.warn(`Failed to normalize URL: ${url}`, error);
          return url.toLowerCase();
        }
      };
      
      // Find tabs that are already open (pinned or not)
      const tabsToOpen = [];
      const alreadyOpenTabs = [];
      const tabsToPin = []; // Onglets ouverts mais pas encore épinglés
      
      for (const tab of categoryTabs) {
        const normalizedConfigUrl = normalizeUrl(tab.url);
        const existingTab = existingTabs.find(existingTab => {
          const normalizedExistingUrl = normalizeUrl(existingTab.url);
          return normalizedExistingUrl === normalizedConfigUrl;
        });
        
        if (existingTab) {
          if (existingTab.pinned) {
            // Onglet déjà ouvert ET épinglé
            alreadyOpenTabs.push(tab);
          } else {
            // Onglet ouvert mais pas encore épinglé - on va l'épingler
            tabsToPin.push({ config: tab, existingTab });
          }
        } else {
          // Onglet pas encore ouvert
          tabsToOpen.push(tab);
        }
      }
      
      // Épingler les onglets existants qui ne sont pas encore épinglés
      const pinResults = [];
      for (const { config, existingTab } of tabsToPin) {
        console.log(`Attempting to pin existing category tab: ${config.url} (ID: ${existingTab.id})`);
        
        const pinResult = await this.safeTabUpdate(existingTab.id, { pinned: true });
        
        if (pinResult.success) {
          pinResults.push({ success: true, tab: pinResult.tab, config });
          console.log(`Successfully pinned existing category tab: ${config.url}`);
        } else {
          console.error(`Failed to pin existing category tab ${config.url}:`, pinResult.error);
          pinResults.push({ success: false, error: pinResult.error, config });
        }
      }
      
      // Si tous les onglets sont déjà ouverts (épinglés ou maintenant épinglés), retourner rapidement
      if (tabsToOpen.length === 0) {
        const totalPinned = pinResults.filter(r => r.success).length;
        const totalSkipped = alreadyOpenTabs.length;
        
        return {
          success: true,
          allAlreadyOpen: totalSkipped > 0 && totalPinned === 0,
          skipped: totalSkipped,
          opened: 0,
          pinned: totalPinned,
          message: totalPinned > 0 ? 'someTabsPinned' : 'allTabsAlreadyOpen'
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
          
          // Support for containers if specified in tab config
          if (tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
            createOptions.cookieStoreId = tab.cookieStoreId;
          }
          
          const newTab = await this.containerUtils.createTabWithContainer(createOptions);
          
          results.push({ success: true, tab: newTab, config: tab });
          console.log(`Opened new pinned category tab: ${tab.url}`);
        } catch (error) {
          console.error(`Failed to open category tab ${tab.url}:`, error);
          results.push({ success: false, error: error.message, config: tab });
        }
      }

      const opened = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalPinned = pinResults.filter(r => r.success).length;

      return {
        success: true,
        results: results,
        pinResults: pinResults,
        opened: opened,
        failed: failed,
        skipped: alreadyOpenTabs.length,
        pinned: totalPinned,
        message: alreadyOpenTabs.length > 0 || totalPinned > 0 ? 
          (totalPinned > 0 ? 'someTabsPinnedAndOpened' : 'someTabsAlreadyOpen') : null
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
      await this.storage.set({ pinnedTabs: this.tabs });
      
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

      await this.storage.set({ pinnedTabs: this.tabs });
      
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
      await this.storage.set({ categories: this.categories });
      
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
      await this.storage.set({ settings: this.settings });
      
      // Notify other parts of the extension about the change
      this.notifyDataChange('settingsChanged');
      
      return { success: true, settings: this.settings };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, error: error.message };
    }
  }

  async handleWindowCreated(window) {
    // Vérifications strictes pour les fenêtres normales uniquement
    if (!this.settings.autoOpenTabs) {
      return; // Paramètre désactivé
    }

    // Vérifications détaillées pour s'assurer que c'est une vraie fenêtre normale
    if (!this.isNormalBrowserWindow(window)) {
      console.log('Auto-open skipped - not a normal browser window:', {
        type: window.type,
        state: window.state,
        incognito: window.incognito
      });
      return;
    }

    try {
      console.log('Auto-opening tabs in new normal window:', window.id);
      
      // Attendre un petit délai pour que la fenêtre soit complètement initialisée
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ensure tabs are loaded before trying to open them
      await this.loadData();
        
      if (this.tabs.length > 0) {
        await this.openAllTabs(window.id);
      }
    } catch (error) {
      console.error('Error during auto-opening tabs:', error);
    }
  }

  // Nouvelle fonction pour détecter strictement les fenêtres normales
  isNormalBrowserWindow(window) {
    // Vérifications de base
    if (!window || window.type !== 'normal') {
      return false;
    }

    // Exclure les fenêtres en mode incognito si souhaité (optionnel)
    // if (window.incognito) {
    //   return false;
    // }

    // Exclure les fenêtres avec des états particuliers
    if (window.state === 'minimized') {
      return false;
    }

    // Vérifier que la fenêtre a une taille raisonnable (pas un popup déguisé)
    if (window.width && window.height) {
      // Rejeter les fenêtres trop petites qui sont probablement des popups
      const MIN_WINDOW_WIDTH = 400;
      const MIN_WINDOW_HEIGHT = 300;
      
      if (window.width < MIN_WINDOW_WIDTH || window.height < MIN_WINDOW_HEIGHT) {
        console.log('Window too small to be a normal window:', {
          width: window.width,
          height: window.height
        });
        return false;
      }
    }

    // Si toutes les vérifications passent, c'est une fenêtre normale
    return true;
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

      await this.storage.set(defaultData);
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
        await this.storage.set({ categories: this.categories });
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
        await this.storage.set({ pinnedTabs: this.tabs });
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
  console.log('🚀 Initializing TabsPinBackground...');
  const tabsPinBackground = new TabsPinBackground();
  
  // Ensure the background script is properly initialized
  window.tabsPinBackground = tabsPinBackground;
  console.log('✅ TabsPinBackground initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize TabsPinBackground:', error);
  
  // Create a minimal fallback handler to respond to messages
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.error('⚠️ Background script not properly initialized, returning error response');
    sendResponse({ 
      success: false, 
      error: 'Background script initialization failed: ' + error.message 
    });
    return true;
  });
}
