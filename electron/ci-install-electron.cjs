'use strict';

// CI helper: download + extract the Electron binary unconditionally.
//
// electron's own node_modules/electron/install.js honours
// ELECTRON_SKIP_BINARY_DOWNLOAD and exits early (exit 0, nothing downloaded)
// when it's truthy. On the GitHub-hosted runners that flag is present in the
// environment and survives a shell `unset`, so the binary never lands, path.txt
// is never written, and `npm run seed` fails with "Electron failed to install
// correctly". This script performs the same download/extract install.js would,
// minus the skip check, and fails loudly if the download itself errors.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

const platform = process.env.npm_config_platform || os.platform();
const arch = process.env.npm_config_arch || os.arch();
const execPath = platformExecPath(platform);
const distPath = path.join(electronDir, 'dist');

console.log(`[ci-electron] installing electron ${version} for ${platform}/${arch}`);

downloadArtifact({ version, artifactName: 'electron', platform, arch })
  .then((zipPath) => {
    console.log(`[ci-electron] downloaded ${zipPath}`);
    return extract(zipPath, { dir: distPath }).then(() => {
      // Mirror install.js: hoist the type defs out of dist, then mark the
      // install as complete by writing path.txt (what index.js reads).
      const srcTypeDef = path.join(distPath, 'electron.d.ts');
      if (fs.existsSync(srcTypeDef)) {
        fs.renameSync(srcTypeDef, path.join(electronDir, 'electron.d.ts'));
      }
      fs.writeFileSync(path.join(electronDir, 'path.txt'), execPath);
      console.log(`[ci-electron] wrote path.txt -> ${execPath}`);
    });
  })
  .catch((err) => {
    console.error('[ci-electron] FAILED:', err.stack || err);
    process.exit(1);
  });
