# Contributing to Karen

## Prerequisites

- macOS
- Node.js 20+
- [GitHub CLI](https://cli.github.com/) authenticated (`gh auth login`)
- [Claude Code CLI](https://claude.ai/code) authenticated (`claude login`)

## Local setup

```bash
git clone https://github.com/sarifmiaa/karen.git
cd karen
npm install
npm run dev
```

## Project structure

```
electron/          # Main process — compiled to dist-electron/*.cjs
  main.ts          # IPC handlers, subprocess execution, app lifecycle
  preload.ts       # contextBridge API exposed to renderer

src/
  components/      # React components grouped by feature
  stores/          # Zustand state stores
  types/           # Shared TypeScript types
```

## IPC pattern

The renderer never accesses Node.js APIs directly. All CLI calls go through:

```
window.api.exec(command, args)   →   IPC   →   execFile in main.ts
```

To add a new capability, add an IPC handler in `electron/main.ts` and expose it in `electron/preload.ts`.

## Dev workflow

- `npm run dev` — starts Vite + Electron concurrently with hot reload
- `npm run lint` — ESLint check
- `npm run build:electron` — recompile main process (needed after editing `electron/`)

Changes to `electron/main.ts` or `electron/preload.ts` require restarting the dev command to take effect.

## Pull requests

- Keep PRs focused on one thing
- Run `npm run lint` before opening a PR
- Describe what you changed and why in the PR body
