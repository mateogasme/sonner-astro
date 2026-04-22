# CLAUDE.md

## Commands

- Run commands from the repo root.
- `npm run dev` starts only `apps/web`.
- `npm run build` builds only `apps/web`; Vercel output is `apps/web/dist`.
- `npm run check` runs `astro check` for both workspaces.
- Focused checks: `npm run check -w packages/sonner-astro` and `npm run check -w apps/web`.
- There is no test, lint, or formatter config in this repo; `astro check` is the main correctness gate.

## Workspace Shape

- npm workspaces are only `packages/sonner-astro` and `apps/web`.
- `apps/web` depends on the library via the workspace alias `"sonner-astro": "*"`, so library edits are consumed directly in dev/build; there is no separate library build step in this repo.
- `.astro/` and `dist/` are generated and ignored.

## Library Internals

- `packages/sonner-astro/components/Toaster.astro` is a thin boot wrapper; the real toast DOM behavior is in `packages/sonner-astro/src/toaster.ts`.
- Data flow is `toast()` / `ToastState` in `src/state.ts` -> `SonnerToaster` subscription in `src/toaster.ts` -> DOM updates.
- Multi-toaster routing is controlled by `toast.toasterId` matching `<Toaster id="...">`.
- Stack height animation is intentionally driven by inline `li.style.height`, `--front-toast-height` on the `<ol>`, and `--initial-height` per toast. Do not try to replace this with pure CSS `height: auto` transitions.

## Demo App

- `apps/web/src/layouts/Layout.astro` mounts the demo `<Toaster>`; section scripts call `toast()` directly.
- `apps/web/src/preview-state.ts` is a shared module singleton for the demo controls. If preview toggles stop syncing across sections, fix that module instead of adding per-section state.

## Existing Docs

- `CLAUDE.md` still has useful deeper notes for the library toast/animation internals.
- Re-check demo behavior in current `apps/web/src` code; the landing-page state notes in `CLAUDE.md` are stale.
