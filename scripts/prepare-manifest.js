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

  // Remove Chrome MV3 service_worker which is ignored and warns on Firefox
  if (manifest.background) {
    delete manifest.background.service_worker;
  }
  
  // Ensure we have an ID and data collection permissions for Firefox
  if (!manifest.browser_specific_settings) {
    manifest.browser_specific_settings = { gecko: {} };
  }
  if (!manifest.browser_specific_settings.gecko) {
    manifest.browser_specific_settings.gecko = {};
  }
  
  // Required ID for Firefox extensions
  manifest.browser_specific_settings.gecko.id = "tabspin@firefox.extension";
  
  // New requirement for Firefox: data collection consent
  // We set it to false as this extension does not collect data
  manifest.browser_specific_settings.gecko.data_collection_permissions = false;
} else if (target === 'chrome') {
  // Remove Firefox-only keys to avoid warnings/errors
  delete manifest.browser_specific_settings;
  
  // Remove background.scripts (Chrome MV3 only supports service_worker)
  delete manifest.background.scripts;
  
  // Remove Firefox-only permissions
  if (manifest.permissions) {
    manifest.permissions = manifest.permissions.filter(p => p !== 'contextualIdentities');
  }
}

// Write the modified manifest
const outputPath = path.join(__dirname, '../manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`✅ Manifest updated for ${target}`);
