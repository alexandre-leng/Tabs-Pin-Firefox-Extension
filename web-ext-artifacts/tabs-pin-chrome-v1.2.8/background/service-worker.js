/**
 * Tabs Pin Service Worker (Background Script)
 * This is the entry point for Chrome (Manifest V3) and Firefox (Manifest V3).
 */

'use strict';

// Import all dependencies
// Note: Paths are relative to this file location (background/)
importScripts(
  "../lib/browser-polyfill.js",
  "../lib/default-categories.js",
  "../lib/storage-manager.js",
  "../lib/container-utils.js",
  "background.js"
);

console.log('🚀 TabsPin Service Worker started');
