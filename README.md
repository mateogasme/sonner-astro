# sonner-astro

An opinionated toast component for Astro, ported to a framework-friendly Astro package with a lightweight DOM runtime.

## Overview

`sonner-astro` gives you a `<Toaster />` component for Astro layouts and a `toast()` API you can call from client-side scripts anywhere in your app.

It supports:

- Default, success, info, warning, error, and loading toasts
- Promise-based loading/success/error flows
- Action and cancel buttons
- Multiple toaster instances via `id` / `toasterId`
- Theme control: `light`, `dark`, and `system`
- Position, offsets, swipe directions, and stack sizing
- Custom icons, class names, inline styles, and unstyled toasts
- Custom toast content via `HTMLElement`

## Installation

```bash
npm install sonner-astro
```

## Quick Start

Mount the toaster once, typically in your main layout:

```astro
---
import Toaster from 'sonner-astro/Toaster.astro';
---

<html lang="en">
  <body>
    <slot />
    <Toaster />
  </body>
</html>
```

Trigger toasts from any client-side script:

```astro
<button id="toast-btn">Show toast</button>

<script>
  import { toast } from 'sonner-astro';

  document.getElementById('toast-btn')?.addEventListener('click', () => {
    toast('Event created', {
      description: 'Monday, January 3rd at 6:00pm',
    });
  });
</script>
```

## Basic Usage

```ts
import { toast } from 'sonner-astro';

toast('Default toast');
toast.success('Saved successfully');
toast.info('Heads up');
toast.warning('Please review this change');
toast.error('Something went wrong');
toast.loading('Uploading...');
```

With a description:

```ts
toast('Event created', {
  description: 'Monday, January 3rd at 6:00pm',
});
```

With action and cancel buttons:

```ts
toast('Event created', {
  action: {
    label: 'Undo',
    onClick: () => {
      console.log('Undo');
    },
  },
  cancel: {
    label: 'Dismiss',
    onClick: () => {
      console.log('Dismiss');
    },
  },
});
```

Dismiss a toast manually:

```ts
const id = toast('Draft saved');

toast.dismiss(id);
toast.dismiss(); // dismiss all active toasts
```

Additional helpers:

```ts
toast.message('Alias for the default toast');

const activeToasts = toast.getToasts();
const fullHistory = toast.getHistory();
```

## Promise Toasts

```ts
const request = new Promise<{ name: string }>((resolve) => {
  setTimeout(() => resolve({ name: 'Astro' }), 1500);
});

toast.promise(request, {
  loading: 'Loading...',
  success: (data) => `${data.name} toast has been added`,
  error: 'Something went wrong.',
});
```

`toast.promise()` also accepts a function returning a promise.

## Custom Toast Content

This package renders custom toasts with real DOM nodes, not framework JSX. Use `toast.custom()` when you want full control over the content.

```ts
import { toast } from 'sonner-astro';

toast.custom((id) => {
  const card = document.createElement('div');
  card.style.display = 'grid';
  card.style.gap = '8px';

  const title = document.createElement('strong');
  title.textContent = 'Custom toast';

  const button = document.createElement('button');
  button.textContent = 'Close';
  button.addEventListener('click', () => toast.dismiss(id));

  card.append(title, button);
  return card;
});
```

## Multiple Toasters

Use `id` on the toaster and `toasterId` on the toast to route notifications to a specific instance.

```astro
---
import Toaster from 'sonner-astro/Toaster.astro';
---

<Toaster id="global" position="top-right" />
<Toaster id="editor" position="bottom-right" />
```

```ts
import { toast } from 'sonner-astro';

toast('Saved globally');

toast('Editor draft saved', {
  toasterId: 'editor',
});
```

Toasts without a `toasterId` are delivered only to the default toaster instance, meaning a `<Toaster />` without an `id`.

## Toaster Props

`Toaster.astro` accepts the following props:

| Prop | Type | Description |
| --- | --- | --- |
| `id` | `string` | Routes toasts when used with `toasterId`. |
| `invert` | `boolean` | Inverts toast appearance. |
| `theme` | `'light' \| 'dark' \| 'system'` | Controls toaster theme. |
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right' \| 'top-center' \| 'bottom-center'` | Default toast position. |
| `hotkey` | `string[]` | Keyboard shortcut used to focus the toaster. Default: `['altKey', 'KeyT']`. |
| `richColors` | `boolean` | Enables rich color styling. |
| `richBackground` | `boolean` | Enables stronger background color styling. |
| `iconColors` | `boolean` | Colors icons without enabling full rich styles. |
| `expand` | `boolean` | Keeps stacked toasts expanded instead of collapsed. |
| `duration` | `number` | Default toast duration in milliseconds. |
| `gap` | `number` | Gap between stacked toasts. |
| `visibleToasts` | `number` | Maximum number of visible toasts in a stack. |
| `closeButton` | `boolean` | Shows a close button by default. |
| `toastOptions` | `object` | Shared defaults applied to each toast. |
| `className` | `string` | Class applied to each toaster list. |
| `style` | `Partial<CSSStyleDeclaration>` | Inline styles applied to each toaster list. |
| `offset` | `number \| string \| { top?, right?, bottom?, left? }` | Desktop viewport offset. |
| `mobileOffset` | `number \| string \| { top?, right?, bottom?, left? }` | Mobile viewport offset. |
| `dir` | `'rtl' \| 'ltr' \| 'auto'` | Text direction for the toaster. |
| `swipeDirections` | `('top' \| 'right' \| 'bottom' \| 'left')[]` | Allowed swipe directions. |
| `icons` | `object` | Custom icons for toast types and close button. |
| `customAriaLabel` | `string` | Overrides the computed ARIA label on the toaster root. |
| `containerAriaLabel` | `string` | Base ARIA label used when `customAriaLabel` is not provided. |

## Toast Options

The `toast()` family accepts these options:

| Option | Type | Description |
| --- | --- | --- |
| `id` | `string \| number` | Reuse an existing ID to update a toast in place. |
| `toasterId` | `string` | Routes the toast to a named toaster instance. |
| `icon` | `string \| HTMLElement` | Custom icon content. |
| `richColors` | `boolean` | Enables rich color styling for this toast. |
| `richBackground` | `boolean` | Enables rich background styling for this toast. |
| `iconColors` | `boolean` | Enables icon-only color styling for this toast. |
| `invert` | `boolean` | Inverts toast appearance. |
| `closeButton` | `boolean` | Overrides close button visibility. |
| `dismissible` | `boolean` | Prevents manual dismissal when `false`. |
| `description` | `string \| HTMLElement \| (id) => string \| HTMLElement` | Secondary content below the title. |
| `duration` | `number` | Auto-close duration in milliseconds. Use `Infinity` to disable. |
| `action` | `{ label, onClick }` | Action button displayed on the toast. |
| `cancel` | `{ label, onClick }` | Cancel button displayed on the toast. |
| `onDismiss` | `(toast) => void` | Called when the toast is dismissed. |
| `onAutoClose` | `(toast) => void` | Called when the toast closes because its timer ends. |
| `cancelButtonStyle` | `Partial<CSSStyleDeclaration>` | Inline styles for the cancel button. |
| `actionButtonStyle` | `Partial<CSSStyleDeclaration>` | Inline styles for the action button. |
| `style` | `Partial<CSSStyleDeclaration>` | Inline styles for the toast element. |
| `unstyled` | `boolean` | Disables built-in styling. |
| `className` | `string` | Additional class for the toast element. |
| `classNames` | `object` | Per-slot class overrides for toast sub-elements. |
| `descriptionClassName` | `string` | Class applied to the description element. |
| `position` | `Toaster` position union | Overrides toaster position for this toast only. |
| `testId` | `string` | Adds `data-testid` to the toast element. |

Title and description values may also be passed as functions that receive the toast `id` and return either a `string` or an `HTMLElement`.

## Shared Defaults With `toastOptions`

`toastOptions` on `<Toaster />` lets you define shared defaults for all toasts created by that instance.

```astro
---
import Toaster from 'sonner-astro/Toaster.astro';
---

<Toaster
  theme="system"
  richColors
  toastOptions={{
    duration: 4000,
    closeButton: true,
    classNames: {
      toast: 'my-toast',
      title: 'my-toast-title',
      description: 'my-toast-description',
    },
  }}
/>
```

Supported `toastOptions` fields are:

- `className`
- `closeButton`
- `descriptionClassName`
- `style`
- `cancelButtonStyle`
- `actionButtonStyle`
- `duration`
- `unstyled`
- `classNames`
- `closeButtonAriaLabel`
- `toasterId`

## Low-Level Exports

The package also exports lower-level primitives if you need them:

```ts
import { ToastState, createToaster, SonnerToaster } from 'sonner-astro';
```

- `ToastState`: internal observable store used by the `toast()` API.
- `createToaster(rootEl, props)`: manually creates a toaster instance on an element.
- `SonnerToaster`: underlying class that powers the DOM runtime.

For most apps, you only need `<Toaster />` and `toast`.

## Development

This repository is an npm workspaces monorepo with two workspaces:

- `packages/sonner-astro`: the library package
- `apps/web`: the Astro demo site

Run commands from the repository root:

```bash
npm install
npm run dev
npm run build
npm run check
```

Focused checks:

```bash
npm run check -w packages/sonner-astro
npm run check -w apps/web
```

Notes:

- `npm run dev` starts only `apps/web`
- `npm run build` builds only `apps/web`
- the Vercel output directory is `apps/web/dist`
- there is no test suite in this repo; `astro check` is the primary correctness gate

## Project Structure

```text
packages/sonner-astro/   Library package
apps/web/                Demo and documentation site
```

Important implementation notes for contributors:

- `packages/sonner-astro/components/Toaster.astro` is a thin boot wrapper
- the real toast DOM behavior lives in `packages/sonner-astro/src/toaster.ts`
- toast dispatch flows through `packages/sonner-astro/src/state.ts`
- stacked height animation is intentionally driven by inline `height` and CSS variables, not pure `height: auto` transitions

## Current Status

The package is already integrated into the demo app through the workspace dependency `"sonner-astro": "*"`, so library changes are consumed directly by `apps/web` during development.
