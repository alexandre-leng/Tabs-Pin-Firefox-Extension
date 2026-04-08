/**
 * Build Script for Tabs Pin
 * Handles manifest preparation and extension packaging with versioning
 * Usage: node scripts/build.js [chrome|firefox]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'chrome';
const packagePath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = pkg.version;

console.log(`🏗️  Starting build for ${target} v${version}...`);

try {
  // 1. Prepare manifest
  console.log(`📝 Preparing manifest...`);
  execSync(`node scripts/prepare-manifest.js ${target}`, { stdio: 'inherit' });

  // 2. Run web-ext build
  const filename = `tabs-pin-${target}-v${version}.zip`;
  console.log(`📦 Packaging extension to ${filename}...`);
  
  // Use npx to ensure web-ext is available
  execSync(`npx web-ext build --overwrite-dest --filename ${filename}`, { stdio: 'inherit' });

  console.log(`🎉 Build for ${target} completed successfully!`);
} catch (error) {
  console.error(`❌ Build failed:`, error.message);
  process.exit(1);
}
