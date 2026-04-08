/**
 * Shared default categories for Tabs Pin.
 * Keeps one single source of truth across background, popup and options pages.
 */
'use strict';

(function initDefaultCategories(globalScope) {
  const CATEGORY_DEFINITIONS = [
    { id: 'work', fallbackName: 'Work', icon: '💼' },
    { id: 'personal', fallbackName: 'Personal', icon: '👤' },
    { id: 'development', fallbackName: 'Development', icon: '💻' },
    { id: 'social', fallbackName: 'Social', icon: '🌐' },
    { id: 'tools', fallbackName: 'Tools', icon: '🔧' },
    { id: 'entertainment', fallbackName: 'Entertainment', icon: '🎮' }
  ];

  function translateCategoryName(category, i18nApi) {
    try {
      const translated = i18nApi && typeof i18nApi.getMessage === 'function'
        ? i18nApi.getMessage(category.id)
        : '';

      return translated || category.fallbackName;
    } catch (_) {
      return category.fallbackName;
    }
  }

  function getDefaultCategories(i18nApi) {
    return CATEGORY_DEFINITIONS.map((category) => ({
      id: category.id,
      name: translateCategoryName(category, i18nApi),
      icon: category.icon
    }));
  }

  globalScope.DefaultCategories = {
    getDefaultCategories
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
