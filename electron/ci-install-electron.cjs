'use strict';

// CI helper: download + extract the Electron binary.
//
// On the GitHub-hosted runners `npm i` is not completing electron's binary
// install (path.txt never gets written) — the download succeeds but the zip
// extraction fails, so `npm run seed` then dies with "Electron failed to install
// correctly". This script reproduces install.js's download + extract with full
// error capture and a retry, so a transient failure (e.g. Defender briefly
// locking electron.exe mid-extract) doesn't sink the whole build.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// A stream 'error' event during extraction surfaces as an uncaught exception
// that bypasses promise .catch — capture both so the real error is always shown.
process.on('uncaughtException', (err) => {
  console.error('[ci-electron] UNCAUGHT:', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('[ci-electron] UNHANDLED REJECTION:', err && err.stack ? err.stack : err);
  process.exit(1);
});

const electronDir = path.dirname(require.resolve('electron/package.json'));
const { version } = require('electron/package.json');

// Resolve electron's own copies of these deps so we use exactly what install.js
// would, whether or not they're hoisted to the top-level node_modules.
const { downloadArtifact } = require(
  require.resolve('@electron/get', { paths: [electronDir] }),
);
const extract = require(require.resolve('extract-zip', { paths: [electronDir] }));

function platformExecPath(platform) {
  switch (platform) {
    case 'mas':
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron';
    case 'win32':
      return 'electron.exe';
    default:
      return 'electron';
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const platform = process.env.npm_config_platform || os.platform();
  const arch = process.env.npm_config_arch || os.arch();
  const execPath = platformExecPath(platform);
  const distPath = path.join(electronDir, 'dist');

  console.log(`[ci-electron] installing electron ${version} for ${platform}/${arch}`);
  console.log(`[ci-electron] electronDir=${electronDir}`);
  console.log(`[ci-electron] distPath=${distPath} (len ${distPath.length})`);

  const zipPath = await downloadArtifact({ version, artifactName: 'electron', platform, arch });
  console.log(`[ci-electron] downloaded ${zipPath}`);
  const { size } = fs.statSync(zipPath);
  console.log(`[ci-electron] zip size ${(size / 1024 / 1024).toFixed(1)} MB`);

  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      fs.rmSync(distPath, { recursive: true, force: true });
      await extract(zipPath, { dir: distPath });
      console.log(`[ci-electron] extracted on attempt ${attempt}`);
      break;
    } catch (err) {
      console.error(
        `[ci-electron] extract attempt ${attempt}/${attempts} failed:`,
        err && err.stack ? err.stack : err,
      );
      if (attempt === attempts) throw err;
      await sleep(2000);
    }
  }

  // Mirror install.js: hoist the type defs out of dist, then mark the install as
  // complete by writing path.txt (what electron/index.js reads).
  const srcTypeDef = path.join(distPath, 'electron.d.ts');
  if (fs.existsSync(srcTypeDef)) {
    fs.renameSync(srcTypeDef, path.join(electronDir, 'electron.d.ts'));
  }
  fs.writeFileSync(path.join(electronDir, 'path.txt'), execPath);
  console.log(`[ci-electron] wrote path.txt -> ${execPath}`);
}

main().catch((err) => {
  console.error('[ci-electron] FAILED:', err && err.stack ? err.stack : err);
  process.exit(1);
});
