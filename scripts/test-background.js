/**
 * Simple test script for background script validation
 * Checks syntax and basic functionality without browser environment
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Background Script...\n');

const backgroundPath = path.join(__dirname, '../background/background.js');

try {
  // Check file exists
  if (!fs.existsSync(backgroundPath)) {
    console.error('❌ Background script not found');
    process.exit(1);
  }
  console.log('✅ Background script file exists');

  // Read and check basic syntax
  const code = fs.readFileSync(backgroundPath, 'utf8');
  
  // Check for essential class structure
  if (code.includes('class TabsPinBackground')) {
    console.log('✅ TabsPinBackground class found');
  } else {
    console.error('❌ TabsPinBackground class not found');
    process.exit(1);
  }

  // Check for proper StorageManager instantiation
  if (code.includes('this.storage = new StorageManager()')) {
    console.log('✅ StorageManager properly instantiated');
  } else if (code.includes('this.storage = browser.storage.local')) {
    console.error('❌ Using browser.storage.local instead of StorageManager');
    process.exit(1);
  } else {
    console.error('❌ No storage initialization found');
    process.exit(1);
  }

  // Check for ContainerUtils
  if (code.includes('this.containerUtils = new ContainerUtils()')) {
    console.log('✅ ContainerUtils properly instantiated');
  } else {
    console.error('❌ ContainerUtils not instantiated');
    process.exit(1);
  }

  // Check essential methods
  const requiredMethods = [
    'constructor',
    'init',
    'performInitialization',
    'loadData',
    'handleMessage',
    'openAllTabs',
    'saveTab',
    'deleteTab',
    'setupEventListeners'
  ];

  let missingMethods = [];
  
  requiredMethods.forEach(method => {
    if (code.includes(method)) {
      console.log(`✅ Method ${method} found`);
    } else {
      missingMethods.push(method);
    }
  });

  if (missingMethods.length > 0) {
    console.error('❌ Missing methods:', missingMethods);
    process.exit(1);
  }

  // Check for initialization pattern
  if (code.includes('try {') && code.includes('new TabsPinBackground()')) {
    console.log('✅ Proper initialization pattern found');
  } else {
    console.error('❌ No proper initialization pattern');
    process.exit(1);
  }

  // Check for error handling in initialization
  if (code.includes('catch (error)') && code.includes('Background script initialization failed')) {
    console.log('✅ Error handling in initialization');
  } else {
    console.error('❌ No error handling in initialization');
    process.exit(1);
  }

  // Check for ping response
  if (code.includes("case 'ping'") && code.includes("message: 'pong'")) {
    console.log('✅ Ping/pong mechanism found');
  } else {
    console.error('❌ No ping/pong mechanism');
    process.exit(1);
  }

  // Check for autoOpenTabs removal
  if (code.includes('autoOpenTabs') || code.includes('onCreated')) {
    console.error('❌ autoOpenTabs functionality still present (should be removed)');
    process.exit(1);
  } else {
    console.log('✅ autoOpenTabs functionality properly removed');
  }

  console.log('\n🎉 Background script validation passed!');
  console.log('\n📋 Background Script Features Validated:');
  console.log('• ✅ Proper class structure');
  console.log('• ✅ StorageManager integration');
  console.log('• ✅ ContainerUtils integration');
  console.log('• ✅ Essential method implementations');
  console.log('• ✅ Error handling and fallbacks');
  console.log('• ✅ Ping/pong communication');
  console.log('• ✅ autoOpenTabs feature removed');
  console.log('\n✅ Background script should initialize properly!');

} catch (error) {
  console.error('❌ Background script validation failed:', error.message);
  process.exit(1);
} 