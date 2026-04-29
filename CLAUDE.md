# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Run commands from the repo root.
- `npm run dev` starts only `apps/web`.
- `npm run build` builds only `apps/web`; Vercel output is `apps/web/dist`.
- `npm run check` runs `astro check` for both workspaces.
- Focused checks: `npm run check -w packages/sonner-astro` and `npm run check -w apps/web`.
- There is no test, lint, or formatter config; `astro check` is the main correctness gate.

## Workspace Shape

- npm workspaces: `packages/sonner-astro` (library) and `apps/web` (demo site).
- `apps/web` depends on the library via `"sonner-astro": "*"` workspace alias — library edits are consumed directly in dev/build with no separate build step.
- Package exports: `.` → `src/index.ts`, `./Toaster.astro` → `components/Toaster.astro`, `./styles.css` → `src/styles.css`.

## Library Internals

- `packages/sonner-astro/components/Toaster.astro` is a thin boot wrapper; real toast DOM behavior is in `src/toaster.ts`.
- Data flow: `toast()` / `ToastState` in `src/state.ts` → `SonnerToaster` subscription in `src/toaster.ts` → DOM updates.
- `src/assets.ts` holds inline SVG strings for default icons (success, warning, info, error, close) and a `getAssetSvg(type)` helper.
- Multi-toaster routing: `toast.toasterId` matched against `<Toaster id="...">`. Toasts without a `toasterId` go only to the default (id-less) toaster.
- Stack height animation is intentionally driven by inline `li.style.height`, `--front-toast-height` on the `<ol>`, and `--initial-height` per toast. Do not replace with pure CSS `height: auto` transitions.

## Demo App

- `apps/web/src/layouts/Layout.astro` mounts the demo `<Toaster position="bottom-right" />`; section scripts call `toast()` directly.
- `apps/web/src/preview-state.ts` is a shared module singleton for demo controls (color mode, duration, position, flags). Sections coordinate via the `sonner-preview-change` CustomEvent dispatched on `window`. Fix sync issues here, not per-section.
- Demo sections live in `apps/web/src/sections/` — one `.astro` file per feature (Types, Action, Promise, RichColors, Theme, Position, etc.).
