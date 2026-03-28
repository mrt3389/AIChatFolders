/**
 * Build script — handles development and production builds for the extension.
 * Usage:
 *   node scripts/build.js --dev        Development build (Chrome)
 *   node scripts/build.js --chrome     Production build (Chrome)
 *   node scripts/build.js --firefox    Production build (Firefox)
 *   node scripts/build.js --dev --watch  Watch mode
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const isFirefox = args.includes('--firefox');
const isWatch = args.includes('--watch');
const target = isFirefox ? 'firefox' : 'chrome';

const DIST_DIR = path.join(DIST, target);

/**
 * Recursively copy a directory.
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Clean and prepare dist directory.
 */
function clean() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

/**
 * Copy manifest.
 */
function copyManifest() {
  const manifestFile = isFirefox ? 'manifest.firefox.json' : 'manifest.json';
  const srcPath = path.join(ROOT, manifestFile);
  const destPath = path.join(DIST_DIR, 'manifest.json');
  fs.copyFileSync(srcPath, destPath);
  console.log(`  Manifest: ${manifestFile} -> dist/${target}/manifest.json`);
}

/**
 * Copy source files.
 */
function copySrc() {
  copyDir(path.join(ROOT, 'src'), path.join(DIST_DIR, 'src'));
  console.log('  Source files copied.');
}

/**
 * Copy assets.
 */
function copyAssets() {
  copyDir(path.join(ROOT, 'assets'), path.join(DIST_DIR, 'assets'));
  console.log('  Assets copied.');
}

/**
 * Copy locales.
 */
function copyLocales() {
  copyDir(path.join(ROOT, '_locales'), path.join(DIST_DIR, '_locales'));
  console.log('  Locales copied.');
}

/**
 * Minify JS files (production only).
 */
async function minifyJS() {
  if (isDev) return;

  try {
    const { minify } = require('terser');
    const jsFiles = findFiles(path.join(DIST_DIR, 'src'), '.js');

    for (const file of jsFiles) {
      const code = fs.readFileSync(file, 'utf8');
      const result = await minify(code, {
        compress: { drop_console: false },
        mangle: false // Keep readable for extension store review
      });
      if (result.code) {
        fs.writeFileSync(file, result.code);
      }
    }
    console.log(`  Minified ${jsFiles.length} JS files.`);
  } catch (e) {
    console.warn('  Terser not installed, skipping JS minification. Run: npm install');
  }
}

/**
 * Minify CSS files (production only).
 */
function minifyCSS() {
  if (isDev) return;

  try {
    const csso = require('csso');
    const cssFiles = findFiles(path.join(DIST_DIR, 'src'), '.css');

    for (const file of cssFiles) {
      const code = fs.readFileSync(file, 'utf8');
      const result = csso.minify(code);
      fs.writeFileSync(file, result.css);
    }
    console.log(`  Minified ${cssFiles.length} CSS files.`);
  } catch (e) {
    console.warn('  CSSO not installed, skipping CSS minification. Run: npm install');
  }
}

/**
 * Find all files with a given extension recursively.
 */
function findFiles(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Main build.
 */
async function build() {
  const start = Date.now();
  console.log(`\nBuilding for ${target} (${isDev ? 'development' : 'production'})...\n`);

  clean();
  copyManifest();
  copySrc();
  copyAssets();
  copyLocales();

  if (!isDev) {
    await minifyJS();
    minifyCSS();
  }

  const elapsed = Date.now() - start;
  console.log(`\nBuild complete in ${elapsed}ms.`);
  console.log(`Output: ${DIST_DIR}\n`);

  if (target === 'chrome') {
    console.log('To load in Chrome:');
    console.log('  1. Open chrome://extensions/');
    console.log('  2. Enable "Developer mode"');
    console.log(`  3. Click "Load unpacked" and select: ${DIST_DIR}`);
  } else if (target === 'firefox') {
    console.log('To load in Firefox:');
    console.log('  1. Open about:debugging#/runtime/this-firefox');
    console.log(`  2. Click "Load Temporary Add-on" and select: ${path.join(DIST_DIR, 'manifest.json')}`);
  }
}

// Watch mode
if (isWatch) {
  build().then(() => {
    console.log('\nWatching for changes...\n');
    const watchDirs = [SRC, path.join(ROOT, 'assets'), path.join(ROOT, '_locales')];

    try {
      const chokidar = require('chokidar');
      const watcher = chokidar.watch(watchDirs, { ignoreInitial: true });
      let buildTimeout = null;

      watcher.on('all', () => {
        clearTimeout(buildTimeout);
        buildTimeout = setTimeout(() => {
          console.log('\nChange detected, rebuilding...');
          build();
        }, 200);
      });
    } catch (e) {
      // Fallback: use fs.watch
      console.log('(Install chokidar for better watch: npm install chokidar)');
      for (const dir of watchDirs) {
        if (fs.existsSync(dir)) {
          fs.watch(dir, { recursive: true }, () => {
            console.log('\nChange detected, rebuilding...');
            build();
          });
        }
      }
    }
  });
} else {
  build();
}
