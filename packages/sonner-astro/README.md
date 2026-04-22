# sonner-astro

An opinionated toast component for Astro.

`sonner-astro` provides a `<Toaster />` Astro component plus a client-side `toast()` API for rendering notifications anywhere in your Astro app.

## Installation

```bash
npm install sonner-astro
```

## Quick Start

Mount the toaster once in your layout:

```astro
---
import Toaster from 'sonner-astro/Toaster.astro';
---

<body>
  <slot />
  <Toaster />
</body>
```

Then trigger toasts from any client-side script:

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

## Features

- Default, success, info, warning, error, and loading toasts
- Promise toasts with loading, success, and error states
- Action and cancel buttons
- Multiple toaster instances via `id` and `toasterId`
- Theme, position, offset, swipe, and stack controls
- Custom icons, class names, and inline styles
- Custom toast content via `toast.custom()` and `HTMLElement`

## Usage

```ts
import { toast } from 'sonner-astro';

toast('Default toast');
toast.success('Saved successfully');
toast.info('Heads up');
toast.warning('Please review this change');
toast.error('Something went wrong');
toast.loading('Uploading...');
```

With actions:

```ts
toast('Event created', {
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
  cancel: {
    label: 'Dismiss',
    onClick: () => console.log('Dismiss'),
  },
});
```

Dismiss toasts:

```ts
const id = toast('Draft saved');

toast.dismiss(id);
toast.dismiss();
```

Helpers:

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

## Custom Toasts

```ts
import { toast } from 'sonner-astro';

toast.custom((id) => {
  const card = document.createElement('div');
  const title = document.createElement('strong');
  const button = document.createElement('button');

  title.textContent = 'Custom toast';
  button.textContent = 'Close';
  button.addEventListener('click', () => toast.dismiss(id));

  card.append(title, button);
  return card;
});
```

## Multiple Toasters

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

## Toaster Props

| Prop | Type | Description |
| --- | --- | --- |
| `id` | `string` | Routes toasts when used with `toasterId`. |
| `invert` | `boolean` | Inverts toast appearance. |
| `theme` | `'light' \| 'dark' \| 'system'` | Controls toaster theme. |
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right' \| 'top-center' \| 'bottom-center'` | Default toast position. |
| `hotkey` | `string[]` | Keyboard shortcut used to focus the toaster. |
| `richColors` | `boolean` | Enables rich color styling. |
| `richBackground` | `boolean` | Enables stronger background color styling. |
| `iconColors` | `boolean` | Colors icons without enabling full rich styles. |
| `expand` | `boolean` | Keeps stacked toasts expanded instead of collapsed. |
| `duration` | `number` | Default toast duration in milliseconds. |
| `gap` | `number` | Gap between stacked toasts. |
| `visibleToasts` | `number` | Maximum number of visible toasts in a stack. |
| `closeButton` | `boolean` | Shows a close button by default. |
| `toastOptions` | `object` | Shared defaults applied to each toast. |
| `className` | `string` | Class applied to the toaster list. |
| `style` | `Partial<CSSStyleDeclaration>` | Inline styles applied to the toaster list. |
| `offset` | `number \| string \| { top?, right?, bottom?, left? }` | Desktop viewport offset. |
| `mobileOffset` | `number \| string \| { top?, right?, bottom?, left? }` | Mobile viewport offset. |
| `dir` | `'rtl' \| 'ltr' \| 'auto'` | Text direction for the toaster. |
| `swipeDirections` | `('top' \| 'right' \| 'bottom' \| 'left')[]` | Allowed swipe directions. |
| `icons` | `object` | Custom icons for toast types and close button. |
| `customAriaLabel` | `string` | Overrides the ARIA label on the toaster root. |
| `containerAriaLabel` | `string` | Base ARIA label used when `customAriaLabel` is not provided. |

## Toast Options

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

## Styling

The package exports its stylesheet as:

```ts
import 'sonner-astro/styles.css';
```

In standard usage you do not need to import this manually because `Toaster.astro` and the main package entry already wire it up.

## License

MIT
