/**
 * Chrome Service Worker Wrapper
 * Loads all script files needed for the background context using importScripts.
 * This allows sharing the same modular architecture with Firefox.
 */

try {
  // Use relative paths from the background directory
  importScripts(
    '../lib/browser-polyfill.js',
    '../lib/default-categories.js',
    '../lib/storage-manager.js',
    '../lib/container-utils.js',
    'background.js'
  );
  console.log('🚀 Service Worker: All scripts loaded successfully');
} catch (error) {
  console.error('❌ Service Worker: Failed to load scripts:', error);
}
