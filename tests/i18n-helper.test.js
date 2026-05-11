/**
 * Tests for i18n-helper.js
 * Uses a mock browser.i18n API for testing outside Firefox.
 */

// Mock browser API
global.browser = {
  i18n: {
    _messages: {},
    getMessage(key, substitutions) {
      const msg = this._messages[key];
      if (!msg) return '';
      let text = msg;
      if (substitutions) {
        substitutions.forEach((sub, i) => {
          text = text.replace('$' + (i + 1), sub);
        });
      }
      return text;
    },
  },
};

const I18nHelper = require('../lib/i18n-helper.js');

describe('I18nHelper', () => {
  describe('msg', () => {
    test('returns message when key exists', () => {
      browser.i18n._messages['testKey'] = 'Hello World';
      expect(I18nHelper.msg('testKey')).toBe('Hello World');
    });

    test('returns fallback when key missing', () => {
      expect(I18nHelper.msg('missingKey', 'Fallback')).toBe('Fallback');
    });

    test('returns key when no fallback and key missing', () => {
      expect(I18nHelper.msg('missingKey')).toBe('missingKey');
    });
  });

  describe('msgSub', () => {
    test('returns substituted message', () => {
      browser.i18n._messages['greeting'] = 'Hello $1';
      expect(I18nHelper.msgSub('greeting', ['World'])).toBe('Hello World');
    });

    test('handles multiple substitutions', () => {
      browser.i18n._messages['count'] = '$1 of $2';
      expect(I18nHelper.msgSub('count', ['3', '10'])).toBe('3 of 10');
    });
  });

  describe('placeholder', () => {
    test('returns placeholder message', () => {
      browser.i18n._messages['placeholderUrl'] = 'https://example.com';
      expect(I18nHelper.placeholder('url')).toBe('https://example.com');
    });
  });
});
