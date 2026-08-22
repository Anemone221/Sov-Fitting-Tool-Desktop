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

Updating the submodule by hand:

```bash
cd react
git checkout <branch-or-commit>
cd ..
git add react
git commit -m "Bump submodule to <sha>"
```

## Automatic rebuilds

A submodule pins an exact commit, so work landing in the application repo does
not reach a release until `react/` is re-pinned. That happens on its own:

1. A push to the application repo's `main` runs its CI (typecheck, lint,
   `build:web`) and, if green, sends a `react-updated` `repository_dispatch`
   here.
2. [`bump-react.yml`](.github/workflows/bump-react.yml) moves `react/` to the
   tip of its tracked branch, commits `Bump react submodule to <sha>`, and
   starts [`build.yml`](.github/workflows/build.yml) — explicitly, because a
   push made with `GITHUB_TOKEN` does not fire an `on: push` trigger. That is
   what the `workflow_dispatch:` trigger on `build.yml` is for; don't remove it.
3. `build.yml` packages Windows / macOS / Linux and publishes a dated `-BETA`
   prerelease.

The dispatch in step 1 needs a fine-grained PAT with **Contents: read-write**
on *this* repo, stored as `DESKTOP_DISPATCH_TOKEN` in the application repo's
Actions secrets. When it expires the application repo's CI still passes and this
repo simply stops rebuilding — the dispatch step logs a warning instead of
failing. Re-pin by hand (above) until it's replaced.

To re-run the bump without a push upstream: `gh workflow run bump-react.yml`.

## License

GPL-3.0 — see [LICENSE](LICENSE). The submodule (application repo) is also
GPL-3.0; this repo's combined work inherits and propagates that license.
