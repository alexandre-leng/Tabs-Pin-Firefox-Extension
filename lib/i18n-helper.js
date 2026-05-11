/**
 * Tabs Pin — i18n Helper
 * Shared i18n utilities used by popup, options, and background.
 */

'use strict';

const I18nHelper = {
  /**
   * Get a localized message with fallback.
   * @param {string} key — i18n key
   * @param {string} [fallback] — fallback text if key not found
   * @returns {string}
   */
  msg(key, fallback) {
    return browser.i18n.getMessage(key) || fallback || key;
  },

  /**
   * Get a localized message with substitutions.
   * @param {string} key — i18n key
   * @param {Array<string>} subs — substitution values
   * @param {string} [fallback] — fallback text
   * @returns {string}
   */
  msgSub(key, subs, fallback) {
    return browser.i18n.getMessage(key, subs) || fallback || key;
  },

  /**
   * Get a localized placeholder for an input element.
   * @param {string} key — i18n key without 'placeholder' prefix
   * @param {string} fallback
   * @returns {string}
   */
  placeholder(key, fallback) {
    return this.msg('placeholder' + key.charAt(0).toUpperCase() + key.slice(1), fallback);
  }
};

// Export for module contexts; also attach to window for non-module scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18nHelper;
}
if (typeof self !== 'undefined') {
  self.I18nHelper = I18nHelper;
}
