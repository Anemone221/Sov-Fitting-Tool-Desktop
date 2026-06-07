# Sov Fitting Tool — Desktop

Electron desktop wrapper for the EVE Sov Fitting Tool. The renderer and the
portable backend (`core/`) live in the [application repository][app-repo],
which is included here as a git submodule at `react/`. This repo carries only
the desktop shell: the Electron main and preload processes, native SQLite
binding, file-dialog and multi-window handling, the seed pipeline, and the
electron-builder installer config.

[app-repo]: https://github.com/Anemone221/Sovereignty-Fitting-Tool

## Layout

```
.
├── react/             ← git submodule = application repo (renderer + core)
├── electron/          ← desktop shell only
│   ├── main.ts            window/app lifecycle
│   ├── preload.ts         window.evesov bridge
│   ├── host/electronHost.ts   implements core's Host capability
│   ├── db/                better-sqlite3 handle + seed-copy on first run
│   ├── seed-entry.cjs     build-time seed entry
│   └── ipc/index.ts       adapts the core handler registry to ipcMain
├── electron.vite.config.ts
├── electron-builder*.yml
└── resources/seed.db  build artifact (gitignored)
```

## First-time setup

```bash
git clone --recurse-submodules https://github.com/Anemone221/Sov-Fitting-Tool-Desktop.git
cd Sov-Fitting-Tool-Desktop
npm ci
(cd react && npm ci --ignore-scripts)
npm run seed
```

If you cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

`--ignore-scripts` on the submodule skips a redundant `better-sqlite3` rebuild —
the desktop repo's `postinstall` already rebuilt the native module for the
pinned Electron version.

## Common scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Launches the desktop app with HMR. |
| `npm run build` | Builds main + preload + renderer into `out/`. |
| `npm run seed` | Downloads the EVE SDE and produces `resources/seed.db`. |
| `npm run typecheck` | Runs `tsc --noEmit` on the Electron + core sources. |
| `npm run rebuild` | Re-runs `@electron/rebuild` for `better-sqlite3`. |
| `npm run package` | Builds a signed Windows installer. |
| `npm run package:dir` | Builds an unsigned, unpacked Windows build (smoke test). |
| `npm run package:mac` / `package:linux` | Cross-platform builds. |

## How the submodule wires into the build

`electron.vite.config.ts` points the renderer's `root` at `react/src` and adds
aliases `@`, `@shared`, and `@core` to the submodule paths. The Electron main
process imports each handler module from `@core/handlers/...`, registers them
into a transport-agnostic registry (`core/registerCore.ts`), and the
`electron/ipc/index.ts` adapter bridges that registry onto `ipcMain`.

Updating the submodule:

```bash
cd react
git checkout <branch-or-commit>
cd ..
git add react
git commit -m "Bump submodule to <sha>"
```

## License

GPL-3.0 — see [LICENSE](LICENSE). The submodule (application repo) is also
GPL-3.0; this repo's combined work inherits and propagates that license.
