/**
 * Prepare Manifest for Target Browser
 * Usage: node scripts/prepare-manifest.js [firefox|chrome]
 */

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'firefox';
const manifestPath = path.join(__dirname, '../manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log(`🔧 Preparing manifest for ${target}...`);

if (target === 'firefox') {
  // Add background.scripts for Firefox compatibility/linter
  manifest.background.scripts = [
    "lib/browser-polyfill.js",
    "lib/default-categories.js",
    "lib/storage-manager.js",
    "lib/container-utils.js",
    "background/background.js"
  ];
  
  // Ensure we have an ID for Firefox
  if (!manifest.browser_specific_settings) {
    manifest.browser_specific_settings = {
      gecko: {
        id: "tabspin@firefox.extension"
      }
    };
  }
} else if (target === 'chrome') {
  // Remove Firefox-only keys to avoid warnings/errors
  delete manifest.browser_specific_settings;
  
  // Set up background as a Service Worker for Chrome MV3
  manifest.background = {
    "service_worker": "background/service-worker-wrapper.js"
  };
  
  // Remove Firefox-only permissions
  if (manifest.permissions) {
    manifest.permissions = manifest.permissions.filter(p => p !== 'contextualIdentities');
  }
}

// Write the modified manifest
const outputPath = path.join(__dirname, '../manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`✅ Manifest updated for ${target}`);
