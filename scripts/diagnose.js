/**
 * Diagnostic Script for Tabs Pin Extension
 * Helps identify and troubleshoot common issues
 */

const fs = require('fs');
const path = require('path');

console.log('🩺 Tabs Pin Extension Diagnostic\n');
console.log('=====================================\n');

let issues = [];
let warnings = [];
let passedChecks = 0;
let totalChecks = 0;

function runCheck(description, checkFunction) {
  totalChecks++;
  console.log(`🔍 ${description}...`);
  try {
    const result = checkFunction();
    if (result === true) {
      console.log(`✅ ${description} - OK\n`);
      passedChecks++;
    } else if (result === 'warning') {
      console.log(`⚠️ ${description} - WARNING\n`);
      passedChecks++;
    } else {
      console.log(`❌ ${description} - FAILED\n`);
      issues.push(description);
    }
  } catch (error) {
    console.log(`❌ ${description} - ERROR: ${error.message}\n`);
    issues.push(`${description} (Error: ${error.message})`);
  }
}

// File existence checks
runCheck('Checking manifest.json', () => {
  return fs.existsSync('manifest.json');
});

runCheck('Checking background script', () => {
  return fs.existsSync('background/background.js');
});

runCheck('Checking popup files', () => {
  return fs.existsSync('popup/popup.html') && fs.existsSync('popup/popup.js');
});

runCheck('Checking options files', () => {
  return fs.existsSync('options/options.html') && fs.existsSync('options/options.js');
});

runCheck('Checking library files', () => {
  return fs.existsSync('lib/storage-manager.js') && fs.existsSync('lib/container-utils.js');
});

// Manifest validation
runCheck('Validating manifest structure', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  const hasName = manifest.name && (manifest.name.startsWith('__MSG_') || typeof manifest.name === 'string');
  const hasVersion = manifest.version && typeof manifest.version === 'string';
  const hasBackground = manifest.background && manifest.background.scripts;
  
  if (!hasName || !hasVersion || !hasBackground) {
    const missing = [];
    if (!hasName) missing.push('name');
    if (!hasVersion) missing.push('version');
    if (!hasBackground) missing.push('background scripts');
    issues.push(`Manifest missing: ${missing.join(', ')}`);
    return false;
  }
  return true;
});

runCheck('Checking manifest background scripts', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  const scripts = manifest.background.scripts;
  return scripts.includes('lib/storage-manager.js') && 
         scripts.includes('lib/container-utils.js') && 
         scripts.includes('background/background.js');
});

// Background script validation
runCheck('Validating background script structure', () => {
  const code = fs.readFileSync('background/background.js', 'utf8');
  return code.includes('class TabsPinBackground') && 
         code.includes('this.storage = new StorageManager()') &&
         code.includes('this.containerUtils = new ContainerUtils()');
});

runCheck('Checking for autoOpenTabs removal', () => {
  const code = fs.readFileSync('background/background.js', 'utf8');
  if (code.includes('autoOpenTabs') || code.includes('onCreated')) {
    issues.push('autoOpenTabs functionality still present (should be removed)');
    return false;
  }
  return true;
});

runCheck('Validating ping/pong mechanism', () => {
  const code = fs.readFileSync('background/background.js', 'utf8');
  return code.includes("case 'ping'") && code.includes("message: 'pong'");
});

// Storage Manager validation
runCheck('Validating StorageManager class', () => {
  const code = fs.readFileSync('lib/storage-manager.js', 'utf8');
  return code.includes('class StorageManager') && 
         code.includes('healthCheck') && 
         code.includes('throttle');
});

// Container Utils validation
runCheck('Validating ContainerUtils class', () => {
  const code = fs.readFileSync('lib/container-utils.js', 'utf8');
  return code.includes('class ContainerUtils') && 
         code.includes('checkContainerSupport');
});

// Popup validation
runCheck('Validating popup script structure', () => {
  const code = fs.readFileSync('popup/popup.js', 'utf8');
  return code.includes('class PopupManager') && 
         code.includes('checkBackgroundConnection') &&
         code.includes('this.storage = new StorageManager()');
});

// Options validation
runCheck('Validating options script structure', () => {
  const code = fs.readFileSync('options/options.js', 'utf8');
  const hasOptionsManager = code.includes('class OptionsManager');
  
  // Check for actual autoOpenTabs usage (not in comments)
  const lines = code.split('\n');
  let hasAutoOpenTabsUsage = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Skip comment lines
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
      continue;
    }
    // Check for actual autoOpenTabs usage
    if (line.includes('autoOpenTabs') && !line.includes('//')) {
      hasAutoOpenTabsUsage = true;
      break;
    }
  }
  
  if (!hasOptionsManager) {
    issues.push('OptionsManager class not found in options.js');
    return false;
  }
  
  if (hasAutoOpenTabsUsage) {
    issues.push('autoOpenTabs functionality still present in options.js (not in comments)');
    return false;
  }
  
  return true;
});

// Localization checks
runCheck('Checking localization files', () => {
  const localesDir = '_locales';
  if (!fs.existsSync(localesDir)) {
    return false;
  }
  
  const languages = fs.readdirSync(localesDir);
  let hasEnglish = false;
  let hasFrench = false;
  
  languages.forEach(lang => {
    const messagesPath = path.join(localesDir, lang, 'messages.json');
    if (fs.existsSync(messagesPath)) {
      if (lang === 'en') hasEnglish = true;
      if (lang === 'fr') hasFrench = true;
    }
  });
  
  return hasEnglish && hasFrench;
});

runCheck('Checking for duplicate JSON keys', () => {
  const localesDir = '_locales';
  const languages = fs.readdirSync(localesDir);
  
  for (const lang of languages) {
    const messagesPath = path.join(localesDir, lang, 'messages.json');
    if (fs.existsSync(messagesPath)) {
      try {
        const content = fs.readFileSync(messagesPath, 'utf8');
        // Try to parse JSON - if there are duplicates, this will succeed but we need to check manually
        const data = JSON.parse(content);
        
        // Count number of times each key appears in the raw content
        const keys = Object.keys(data);
        for (const key of keys) {
          const regex = new RegExp(`"${key}"\\s*:`, 'g');
          const matches = content.match(regex);
          if (matches && matches.length > 1) {
            issues.push(`Duplicate key "${key}" in ${lang}/messages.json`);
            return false;
          }
        }
      } catch (error) {
        issues.push(`Invalid JSON in ${lang}/messages.json: ${error.message}`);
        return false;
      }
    }
  }
  
  return true;
});

// Build validation
runCheck('Checking build output', () => {
  const buildExists = fs.existsSync('dist/tabsflow-firefox-1.2.4.xpi');
  if (!buildExists) {
    warnings.push('Extension not built yet - run "node scripts/build-extension.js"');
    return 'warning';
  }
  return true;
});

// Final report
console.log('\n📊 DIAGNOSTIC REPORT');
console.log('===================\n');

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
console.log(`❌ Issues: ${issues.length}`);
console.log(`⚠️ Warnings: ${warnings.length}\n`);

if (issues.length > 0) {
  console.log('🚨 ISSUES FOUND:');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️ WARNINGS:');
  warnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning}`);
  });
  console.log('');
}

if (issues.length === 0) {
  console.log('🎉 NO ISSUES FOUND!');
  console.log('');
  console.log('📋 EXTENSION STATUS: HEALTHY');
  console.log('');
  console.log('🔧 NEXT STEPS:');
  console.log('1. Build the extension: node scripts/build-extension.js');
  console.log('2. Test in Firefox: about:debugging → Load Temporary Add-on');
  console.log('3. Install the XPI file: dist/tabsflow-firefox-1.2.4.xpi');
} else {
  console.log('🔧 RECOMMENDED ACTIONS:');
  console.log('1. Fix the issues listed above');
  console.log('2. Run this diagnostic again');
  console.log('3. Build and test the extension');
  
  process.exit(1);
}

console.log('\n✅ Diagnostic complete!\n'); 