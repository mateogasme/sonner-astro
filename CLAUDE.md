# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root unless noted.

```bash
npm run dev          # start apps/web dev server (Astro, port 4321)
npm run build        # production build of apps/web
npm run check        # type-check both packages/sonner-astro and apps/web

# Target a single workspace
npm run check -w packages/sonner-astro
npm run check -w apps/web
```

There is no test suite. Type checking (`astro check`) is the primary correctness gate.

## Monorepo Structure

```
packages/sonner-astro/   ← the library package
apps/web/                ← landing page / demo site
```

`apps/web` depends on `packages/sonner-astro` via the workspace alias `"sonner-astro": "*"`. Changes to the library are live-reloaded without a separate build step.

## Library Architecture (`packages/sonner-astro/src/`)

### Data flow

```
toast() call  →  ToastState (Observer)  →  SonnerToaster subscriber  →  DOM
```

**`state.ts`** — `ToastState` is a global `Observer` singleton. `toast()` and its variants (`toast.success`, `toast.promise`, etc.) call `ToastState.create()` or `ToastState.addToast()`, which notify all subscribers. The subscriber in `SonnerToaster` handles both new toasts and updates to existing ones (same `id` = update).

**`toaster.ts`** — `SonnerToaster` class. One instance per `<Toaster>` on the page. Subscribes to `ToastState` in `setupSubscriptions()`. All DOM manipulation lives here: building `<li>` elements, animating heights, managing timers, handling swipe gestures. Key methods:

- `addToastDOM` — creates the `<li>`, measures initial height, sets up `ResizeObserver`, schedules the `data-mounted='true'` RAF
- `updateToastContent` — rebuilds inner HTML on toast updates (e.g. promise loading→success); preserves the loading spinner clone so it can fade out
- `applyIndexAttrs` — re-indexes all toasts after any add/remove. Manages the `height` inline style for non-front toasts (see Height Animation below)
- `applyOffsets` — sets `--offset` and `--initial-height` CSS vars on each toast, then calls `applyIndexAttrs`
- `applyExpandedToToasts` — sets `data-expanded` and manages inline height on expand/collapse
- `deleteToast` / `removeFromDOM` — marks removed, waits `TIME_BEFORE_UNMOUNT` (200ms) for exit animation

**`Toaster.astro`** — thin wrapper. Passes serialized props via `is:inline` to `window.__sonnerAstroProps`, then a regular `<script>` calls `createToaster()`. Guards against double-boot with `window.__sonnerAstroBooted`.

**`styles.css`** — all visual logic via CSS variables. No class toggling for animations; data-attributes drive state.

### Height animation

CSS cannot transition `height: auto → px`. The library solves this with explicit inline styles:

- Non-front toasts always have `li.style.height = frontHeight` (mirrors React Sonner's `height: heights[0]?.height`).
- First time a toast goes front→non-front: read `getBoundingClientRect().height`, pin that inline, force a reflow, then set `frontHeight` as target — gives CSS a concrete "from" value.
- On expand: `applyExpandedToToasts` clears the inline style so `height: var(--initial-height)` from the CSS rule wins (inline style has higher specificity and would otherwise override it).
- On collapse: inline style is re-pinned to `frontHeight` so future `--front-toast-height` changes have an explicit "from" value.

`--front-toast-height` is set on the `<ol>` element. `--initial-height` is set per-`<li>`. The CSS transition `height 400ms` on `[data-sonner-toast]` handles all smooth changes.

### Multi-toaster support

Each `<Toaster id="foo">` filters `ToastState` events by `toast.toasterId`. Toasts without a `toasterId` go to the default toaster (no `id`).

## Landing Page Architecture (`apps/web/src/`)

### Global preview state (`src/preview-state.ts`)

A module-level singleton (`flags` object) that stores which options are currently active: `richColors`, `closeButton`, `action`, `cancel`. Because Astro/Vite bundles all client scripts sharing the same module, all section scripts get the same singleton instance.

- `toggleFlag(key)` — flips the flag, dispatches `sonner-preview-change` on `window`
- `getToastOpts()` — returns a plain object to spread into any `toast()` call
- `toOptsCode(extra?)` — builds the formatted options string for code preview display

Every section (`Hero`, `Types`, `Position`) spreads `getToastOpts()` into its toast calls. `Types.astro` also listens for `sonner-preview-change` to refresh its code preview when flags change.

### Sections

- **`Other.astro`** — the four option buttons are independent toggles (not exclusive). Toggling fires an immediate `toast.success` preview. `Custom` remains a one-shot direct trigger.
- **`Types.astro`** — each entry has `code: () => string` (dynamic, uses `toOptsCode`) and `action: () => void`. Re-renders the code preview on `sonner-preview-change`.
- **`Position.astro`** — exclusive selection among the 6 positions; toasts spread `getToastOpts()`.
- **`CodeBlock.astro`** — renders a `<pre>/<code>` block with a copy button. Sections update it by writing to `codeEl.textContent` and `copyBtn.dataset.code`.
