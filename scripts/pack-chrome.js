/**
 * Pack Chrome extension into a .zip file for distribution.
 * Usage: node scripts/pack-chrome.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist', 'chrome');
const pkg = require(path.join(ROOT, 'package.json'));

if (!fs.existsSync(DIST_DIR)) {
  console.error('Error: dist/chrome/ does not exist. Run "npm run build:chrome" first.');
  process.exit(1);
}

const zipName = `ai-chat-folders-chrome-v${pkg.version}.zip`;
const zipPath = path.join(ROOT, 'dist', zipName);

// Remove old zip if exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Use system zip command or tar
try {
  if (process.platform === 'win32') {
    execSync(`powershell Compress-Archive -Path "${DIST_DIR}\\*" -DestinationPath "${zipPath}"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${DIST_DIR}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  }
  console.log(`\nPacked: ${zipPath}`);
  console.log(`Size: ${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB`);
} catch (e) {
  console.error('Failed to create zip:', e.message);
  process.exit(1);
}
