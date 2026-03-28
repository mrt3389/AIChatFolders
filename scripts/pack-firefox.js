/**
 * Pack Firefox extension into a .xpi file for distribution.
 * Usage: node scripts/pack-firefox.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist', 'firefox');
const pkg = require(path.join(ROOT, 'package.json'));

if (!fs.existsSync(DIST_DIR)) {
  console.error('Error: dist/firefox/ does not exist. Run "npm run build:firefox" first.');
  process.exit(1);
}

const xpiName = `ai-chat-folders-firefox-v${pkg.version}.xpi`;
const xpiPath = path.join(ROOT, 'dist', xpiName);

// Remove old xpi if exists
if (fs.existsSync(xpiPath)) {
  fs.unlinkSync(xpiPath);
}

// XPI is just a zip with .xpi extension
try {
  if (process.platform === 'win32') {
    const zipPath = xpiPath.replace('.xpi', '.zip');
    execSync(`powershell Compress-Archive -Path "${DIST_DIR}\\*" -DestinationPath "${zipPath}"`, { stdio: 'inherit' });
    fs.renameSync(zipPath, xpiPath);
  } else {
    execSync(`cd "${DIST_DIR}" && zip -r "${xpiPath}" .`, { stdio: 'inherit' });
  }
  console.log(`\nPacked: ${xpiPath}`);
  console.log(`Size: ${(fs.statSync(xpiPath).size / 1024).toFixed(1)} KB`);
} catch (e) {
  console.error('Failed to create xpi:', e.message);
  process.exit(1);
}
