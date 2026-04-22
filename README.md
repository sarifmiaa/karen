# Karen

A macOS desktop app for browsing GitHub pull requests across all your orgs and reviewing them with Claude AI.

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- Browse open PRs across all your GitHub orgs in one place
- Read PR descriptions and file diffs
- AI-powered code review via Claude (streamed output)
- Follow-up chat with Claude about a PR
- Reviews cached locally so you don't re-run them

## Prerequisites

- **macOS only** (Windows and Linux are not supported)
- [GitHub CLI](https://cli.github.com/) — authenticated (`gh auth login`)
- [Claude Code CLI](https://claude.ai/code) — authenticated (`claude login`)
- Node.js 20+

## Getting started

```bash
git clone https://github.com/sarifmiaa/karen.git
cd karen
npm install
npm run dev
```

The app will open automatically. On first launch it checks that `gh` and `claude` CLIs are available and authenticated.

## Build

```bash
# Compile Electron main process
npm run build:electron

# Package the app (macOS .dmg)
npm run pack
```

## Tech stack

- [Electron](https://electronjs.org/) 41 — macOS desktop shell
- [Vite](https://vitejs.dev/) 8 + [React](https://react.dev/) 19 — renderer
- [TypeScript](https://typescriptlang.org/) 6
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Zustand](https://zustand-demo.pmnd.rs/) — state management
- [GitHub CLI](https://cli.github.com/) — data fetching (`gh` subprocess)
- [Claude Code CLI](https://claude.ai/code) — AI reviews (`claude` subprocess)

## Architecture

```
electron/                    # Main process (Node.js)
  main.ts                    # App lifecycle, IPC handlers, subprocess execution
  preload.ts                 # contextBridge — exposes window.api to renderer

src/
  components/                # UI components grouped by feature
    PRDetail/
      DiffView/              # Complex components get their own folder
        index.ts             # Barrel re-export
        DiffView.tsx         # Root component
        DiffFileSection.tsx  # Sub-components co-located here
        DiffHunkSection.tsx
        InlineFeedbackCard.tsx
        parseDiff.ts         # Pure logic — no React, no imports from outside
        types.ts             # Types internal to this feature
  stores/                    # Zustand stores — own their domain types
  types/                     # Global ambient declarations only (electron.d.ts)
```

The renderer never touches Node.js directly. All `gh` and `claude` commands go through `window.api.exec()` → IPC → `execFile` in the main process.

### Conventions

- **Co-locate by default** — types, utilities, and sub-components live next to the component that owns them
- **Promote to global only when shared** — `src/types/` is for ambient declarations only; store types live in their store file
- **Pure logic in `.ts` files** — no React imports in parser/utility files; makes them trivially testable
- **Barrel exports via `index.ts`** — complex components expose a single import surface; callers never import from internal files

## License

MIT
