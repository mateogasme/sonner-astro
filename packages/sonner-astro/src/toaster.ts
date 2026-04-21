import { ToastState } from './state';
import { getAssetSvg, buildLoaderHTML, CLOSE_SVG } from './assets';
import {
  isAction,
  type HeightT,
  type Position,
  type SwipeDirection,
  type ToastT,
  type ToastToDismiss,
  type ToasterProps,
  type TitleT,
} from './types';

const VISIBLE_TOASTS_AMOUNT = 3;
const VIEWPORT_OFFSET = '24px';
const MOBILE_VIEWPORT_OFFSET = '16px';
const TOAST_LIFETIME = 5000;
const TOAST_WIDTH = 356;
const GAP = 14;
const SWIPE_THRESHOLD = 45;
const TIME_BEFORE_UNMOUNT = 200;

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function getDefaultSwipeDirections(position: string): Array<SwipeDirection> {
  const [y, x] = position.split('-');
  const directions: SwipeDirection[] = [];
  if (y) directions.push(y as SwipeDirection);
  if (x) directions.push(x as SwipeDirection);
  return directions;
}

function getDocumentDirection(): 'rtl' | 'ltr' {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'ltr';
  const dirAttribute = document.documentElement.getAttribute('dir');
  if (dirAttribute === 'auto' || !dirAttribute) {
    return window.getComputedStyle(document.documentElement).direction as 'rtl' | 'ltr';
  }
  return dirAttribute as 'rtl' | 'ltr';
}

function assignOffset(
  defaultOffset: ToasterProps['offset'],
  mobileOffset: ToasterProps['mobileOffset'],
): Record<string, string> {
  const styles: Record<string, string> = {};
  [defaultOffset, mobileOffset].forEach((offset, index) => {
    const isMobile = index === 1;
    const prefix = isMobile ? '--mobile-offset' : '--offset';
    const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;

    const assignAll = (val: string | number) => {
      ['top', 'right', 'bottom', 'left'].forEach((key) => {
        styles[`${prefix}-${key}`] = typeof val === 'number' ? `${val}px` : val;
      });
    };

    if (typeof offset === 'number' || typeof offset === 'string') {
      assignAll(offset);
    } else if (typeof offset === 'object' && offset !== null) {
      (['top', 'right', 'bottom', 'left'] as const).forEach((key) => {
        const v = (offset as any)[key];
        if (v === undefined) styles[`${prefix}-${key}`] = defaultValue;
        else styles[`${prefix}-${key}`] = typeof v === 'number' ? `${v}px` : v;
      });
    } else {
      assignAll(defaultValue);
    }
  });
  return styles;
}

function renderTitle(target: HTMLElement, title: TitleT | undefined, id: number | string) {
  target.innerHTML = '';
  if (title == null) return;
  if (typeof title === 'function') {
    const out = (title as any)(id);
    if (out instanceof HTMLElement) target.appendChild(out);
    else target.textContent = String(out);
  } else if (title instanceof HTMLElement) {
    target.appendChild(title);
  } else {
    target.textContent = String(title);
  }
}

function applyStyle(el: HTMLElement, style?: Partial<CSSStyleDeclaration>) {
  if (!style) return;
  for (const k in style) {
    try {
      (el.style as any)[k] = (style as any)[k];
    } catch {}
  }
}

interface PerToastState {
  el: HTMLLIElement;
  mounted: boolean;
  removed: boolean;
  swiping: boolean;
  isSwiped: boolean;
  swipeOut: boolean;
  swipeDirection: 'x' | 'y' | null;
  swipeOutDirection: 'left' | 'right' | 'up' | 'down' | null;
  initialHeight: number;
  offsetBeforeRemove: number;
  offset: number;
  pointerStart: { x: number; y: number } | null;
  dragStartTime: number | null;
  remainingTime: number;
  closeTimerStart: number;
  lastCloseTimerStart: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  resizeObserver: ResizeObserver | null;
  unmountTimeout: ReturnType<typeof setTimeout> | null;
}

export interface InitOptions extends ToasterProps {
  rootEl: HTMLElement; // <section>
}

export class SonnerToaster {
  private opts: Required<Pick<ToasterProps, 'position' | 'hotkey' | 'gap' | 'visibleToasts'>> & ToasterProps;
  private rootEl: HTMLElement;
  private toasts: ToastT[] = [];
  private heights: HeightT[] = [];
  private perToast = new Map<number | string, PerToastState>();
  private lists = new Map<Position, HTMLOListElement>(); // one <ol> per position
  private expanded = false;
  private interacting = false;
  private isDocumentHidden = false;
  private actualTheme: 'light' | 'dark' = 'light';
  private unsubscribe: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private mqlHandler: ((e: MediaQueryListEvent) => void) | null = null;
  private mql: MediaQueryList | null = null;

  constructor(options: InitOptions) {
    const {
      rootEl,
      position = 'bottom-right',
      hotkey = ['altKey', 'KeyT'],
      gap = GAP,
      visibleToasts = VISIBLE_TOASTS_AMOUNT,
      theme = 'light',
      ...rest
    } = options;
    this.rootEl = rootEl;
    this.opts = { position, hotkey, gap, visibleToasts, theme, ...rest };

    this.actualTheme =
      theme !== 'system'
        ? theme
        : typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    this.setupRoot();
    this.setupSubscriptions();
  }

  private setupRoot() {
    const { hotkey = [], customAriaLabel, containerAriaLabel = 'Notifications' } = this.opts;
    const hotkeyLabel = hotkey.join('+').replace(/Key/g, '').replace(/Digit/g, '');
    this.rootEl.setAttribute('aria-label', customAriaLabel ?? `${containerAriaLabel} ${hotkeyLabel}`);
    this.rootEl.setAttribute('tabindex', '-1');
    this.rootEl.setAttribute('aria-live', 'polite');
    this.rootEl.setAttribute('aria-relevant', 'additions text');
    this.rootEl.setAttribute('aria-atomic', 'false');
    this.rootEl.setAttribute('data-react-aria-top-layer', '');
  }

  private setupSubscriptions() {
    this.unsubscribe = ToastState.subscribe((t) => this.handleIncoming(t));

    this.visibilityHandler = () => {
      this.isDocumentHidden = document.hidden;
      this.toasts.forEach((toast) => this.updateTimer(toast));
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.isDocumentHidden = document.hidden;

    this.keyHandler = (event) => {
      const hk = this.opts.hotkey || [];
      const pressed = hk.length > 0 && hk.every((key) => (event as any)[key] || event.code === key);
      if (pressed) {
        this.setExpanded(true);
        const firstList = this.lists.values().next().value;
        firstList?.focus();
      }
      const firstList = this.lists.values().next().value;
      if (
        event.code === 'Escape' &&
        firstList &&
        (document.activeElement === firstList || firstList.contains(document.activeElement))
      ) {
        this.setExpanded(false);
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    if (this.opts.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      this.mql = window.matchMedia('(prefers-color-scheme: dark)');
      this.mqlHandler = (e) => {
        this.actualTheme = e.matches ? 'dark' : 'light';
        this.lists.forEach((ol) => ol.setAttribute('data-sonner-theme', this.actualTheme));
      };
      try {
        this.mql.addEventListener('change', this.mqlHandler);
      } catch {
        // Safari < 14
        (this.mql as any).addListener(this.mqlHandler);
      }
    }
  }

  destroy() {
    this.unsubscribe?.();
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler);
    if (this.mql && this.mqlHandler) {
      try {
        this.mql.removeEventListener('change', this.mqlHandler);
      } catch {
        (this.mql as any).removeListener(this.mqlHandler);
      }
    }
    this.perToast.forEach((s) => {
      s.resizeObserver?.disconnect();
      if (s.timeoutId) clearTimeout(s.timeoutId);
      if (s.unmountTimeout) clearTimeout(s.unmountTimeout);
    });
    this.rootEl.innerHTML = '';
  }

  private handleIncoming(data: ToastT | ToastToDismiss) {
    if ((data as ToastToDismiss).dismiss) {
      requestAnimationFrame(() => {
        const toast = this.toasts.find((t) => t.id === data.id);
        if (toast) {
          toast.delete = true;
          toast.onDismiss?.(toast);
          this.deleteToast(toast);
        }
      });
      return;
    }

    // Filter by toasterId match
    const t = data as ToastT;
    const myId = this.opts.id;
    if (myId) {
      if (t.toasterId !== myId) return;
    } else {
      if (t.toasterId) return;
    }

    setTimeout(() => {
      const idx = this.toasts.findIndex((x) => x.id === t.id);
      if (idx !== -1) {
        // Update existing
        this.toasts[idx] = { ...this.toasts[idx], ...t };
        this.updateToastContent(this.toasts[idx]);
        this.updateTimer(this.toasts[idx]);
      } else {
        // Add new at head
        this.toasts = [t, ...this.toasts];
        this.addToastDOM(t);
      }
      this.applyExpandedToToasts();
    });
  }

  // --- Rendering ---

  private ensureList(position: Position): HTMLOListElement {
    let ol = this.lists.get(position);
    if (ol) return ol;
    ol = document.createElement('ol');
    const [y, x] = position.split('-');
    ol.setAttribute('data-sonner-toaster', '');
    ol.setAttribute('data-sonner-theme', this.actualTheme);
    ol.setAttribute('data-y-position', y);
    ol.setAttribute('data-x-position', x);
    ol.setAttribute('dir', this.opts.dir === 'auto' || !this.opts.dir ? getDocumentDirection() : this.opts.dir);
    ol.setAttribute('tabindex', '-1');
    if (this.opts.className) ol.className = this.opts.className;

    // base vars
    ol.style.setProperty('--width', `${TOAST_WIDTH}px`);
    ol.style.setProperty('--gap', `${this.opts.gap}px`);
    const offsets = assignOffset(this.opts.offset, this.opts.mobileOffset);
    for (const k in offsets) ol.style.setProperty(k, offsets[k]);
    applyStyle(ol as unknown as HTMLElement, this.opts.style);

    ol.addEventListener('mouseenter', () => this.setExpanded(true));
    ol.addEventListener('mousemove', () => this.setExpanded(true));
    ol.addEventListener('mouseleave', () => {
      if (!this.interacting) this.setExpanded(false);
    });
    ol.addEventListener('dragend', () => this.setExpanded(false));
    ol.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement;
      if (target && target.dataset && target.dataset.dismissible === 'false') return;
      this.interacting = true;
    });
    ol.addEventListener('pointerup', () => {
      this.interacting = false;
    });

    // Focus management: restore focus to the previously focused element when
    // keyboard users navigate into the toast list and it subsequently collapses.
    let lastFocusedEl: HTMLElement | null = null;
    let isFocusWithin = false;
    ol.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target?.dataset?.dismissible === 'false') return;
      if (!isFocusWithin) {
        isFocusWithin = true;
        lastFocusedEl = (event as FocusEvent).relatedTarget as HTMLElement | null;
      }
    });
    ol.addEventListener('focusout', (event) => {
      const fe = event as FocusEvent;
      if (isFocusWithin && !ol.contains(fe.relatedTarget as Node)) {
        isFocusWithin = false;
        if (lastFocusedEl) {
          lastFocusedEl.focus({ preventScroll: true });
          lastFocusedEl = null;
        }
      }
    });

    this.rootEl.appendChild(ol);
    this.lists.set(position, ol);
    return ol;
  }

  private getToastPosition(toast: ToastT): Position {
    return toast.position || this.opts.position || 'bottom-right';
  }

  private heightsAtPosition(position: Position): HeightT[] {
    return this.heights.filter((h) => h.position === position);
  }

  private addToastDOM(toast: ToastT) {
    const position = this.getToastPosition(toast);
    const ol = this.ensureList(position);

    const li = document.createElement('li');
    const state: PerToastState = {
      el: li,
      mounted: false,
      removed: false,
      swiping: false,
      isSwiped: false,
      swipeOut: false,
      swipeDirection: null,
      swipeOutDirection: null,
      initialHeight: 0,
      offsetBeforeRemove: 0,
      offset: 0,
      pointerStart: null,
      dragStartTime: null,
      remainingTime: toast.duration || this.opts.duration || TOAST_LIFETIME,
      closeTimerStart: 0,
      lastCloseTimerStart: 0,
      timeoutId: null,
      resizeObserver: null,
      unmountTimeout: null,
    };
    this.perToast.set(toast.id, state);

    this.buildToastStatic(toast, li);
    this.updateToastContent(toast);
    this.attachPointerHandlers(toast, li);

    ol.appendChild(li);

    // Measure initial height
    const h = li.getBoundingClientRect().height;
    state.initialHeight = h;
    this.heights = [{ toastId: toast.id, height: h, position }, ...this.heights];
    this.applyIndexAttrs();
    this.applyOffsets();

    // ResizeObserver for content changes
    if (typeof ResizeObserver !== 'undefined') {
      state.resizeObserver = new ResizeObserver(() => {
        if (!state.mounted || state.removed || state.swipeOut || state.swiping) return;
        // If an explicit inline height is set, the element's rendered height is controlled
        // by stacking (applyIndexAttrs). The auto/restore trick would set height:auto during
        // an ongoing CSS transition, cancelling and restarting it on every animation frame —
        // making the height appear stuck. Skip; content changes for stacking-controlled
        // toasts are handled by updateToastContent.
        if (li.style.height !== '') return;
        // For expanded non-front toasts (style.height='', data-front='false'), the CSS
        // height transition is in progress (e.g. var(--initial-height) animating 52→76).
        // Setting height:auto via getBCR cancels the ongoing transition — the element
        // jumps to the final value. Only the front toast (no CSS height rule → always auto)
        // is safe to measure via the auto/restore trick. Non-front content changes are
        // handled by updateToastContent → applyOffsets.
        if (li.getAttribute('data-front') !== 'true') return;
        const original = li.style.height;
        li.style.height = 'auto';
        const newH = li.getBoundingClientRect().height;
        li.style.height = original;
        if (Math.abs(newH - state.initialHeight) < 0.5) return;
        state.initialHeight = newH;
        const idx = this.heights.findIndex((x) => x.toastId === toast.id);
        if (idx !== -1) this.heights[idx] = { ...this.heights[idx], height: newH };
        else this.heights = [{ toastId: toast.id, height: newH, position }, ...this.heights];
        this.applyOffsets();
      });
      state.resizeObserver.observe(li);
    }

    // Trigger enter animation next frame
    requestAnimationFrame(() => {
      state.mounted = true;
      li.setAttribute('data-mounted', 'true');
    });

    this.updateTimer(toast);
  }

  private buildToastStatic(toast: ToastT, li: HTMLLIElement) {
    const position = this.getToastPosition(toast);
    const [y, x] = position.split('-');
    li.setAttribute('tabindex', '0');
    li.setAttribute('data-sonner-toast', '');
    li.setAttribute('data-mounted', 'false');
    li.setAttribute('data-removed', 'false');
    li.setAttribute('data-visible', 'true');
    li.setAttribute('data-y-position', y);
    li.setAttribute('data-x-position', x);
    li.setAttribute('data-swiping', 'false');
    li.setAttribute('data-swiped', 'false');
    li.setAttribute('data-swipe-out', 'false');
    li.setAttribute('data-front', 'true');
    li.setAttribute('data-index', '0');
    li.setAttribute('data-expanded', 'false');
    li.style.setProperty('--index', '0');
    li.style.setProperty('--toasts-before', '0');
    li.style.setProperty('--z-index', '1');
    li.style.setProperty('--offset', '0px');
    li.style.setProperty('--initial-height', '0px');
  }

  private updateToastContent(toast: ToastT) {
    const state = this.perToast.get(toast.id);
    if (!state) return;
    const li = state.el;
    const toastType = toast.type;
    const dismissible = toast.dismissible !== false;
    const invert = toast.invert || this.opts.invert;
    const defaultRichColors = this.opts.richColors;
    const defaultRichBackground = this.opts.richBackground;
    const defaultIconColors = this.opts.iconColors;
    const closeButton = toast.closeButton ?? (this.opts.toastOptions?.closeButton ?? this.opts.closeButton);
    const icons = this.opts.icons;
    const toastOptions = this.opts.toastOptions;
    const classNames = toastOptions?.classNames;
    const closeButtonAriaLabel = toastOptions?.closeButtonAriaLabel ?? 'Close toast';
    const isUnstyled = Boolean(toast.jsx || toast.unstyled || toastOptions?.unstyled);

    // Class names
    li.className = cn(
      toastOptions?.className,
      toast.className,
      classNames?.toast,
      toast.classNames?.toast,
      classNames?.default,
      toastType ? (classNames as any)?.[toastType] : undefined,
      toastType ? (toast.classNames as any)?.[toastType] : undefined,
    );

    // data attrs
    li.setAttribute('data-styled', String(!isUnstyled));
    li.setAttribute('data-rich-colors', String(toast.richColors ?? defaultRichColors ?? false));
    li.setAttribute('data-rich-bg', String(toast.richBackground ?? defaultRichBackground ?? false));
    li.setAttribute('data-icon-colors', String(toast.iconColors ?? defaultIconColors ?? false));
    li.setAttribute('data-promise', String(Boolean(toast.promise)));
    li.setAttribute('data-dismissible', String(dismissible));
    if (toastType) li.setAttribute('data-type', toastType);
    else li.removeAttribute('data-type');
    li.setAttribute('data-invert', String(Boolean(invert)));
    if (toast.testId) li.setAttribute('data-testid', toast.testId);

    // Inline style from toast.style / toastOptions.style
    applyStyle(li, toastOptions?.style);
    applyStyle(li, toast.style);

    // Before rebuilding, preserve the loading spinner so it can animate out.
    // When a promise toast transitions loading → success/error, React sets
    // data-visible='false' on the loader wrapper (triggering sonner-fade-out).
    // We clone it, rebuild the DOM, then re-insert the clone so the CSS
    // animation fires correctly. The clone is removed after the animation ends.
    let fadingLoader: Element | null = null;
    if (state && state.mounted && toastType !== 'loading') {
      const existingLoader = li.querySelector('.sonner-loading-wrapper[data-visible="true"]');
      if (existingLoader) {
        const clone = existingLoader.cloneNode(true) as Element;
        clone.setAttribute('data-visible', 'false');
        fadingLoader = clone;
      }
    }

    // Build inner content
    li.innerHTML = '';

    // Close button
    const isLoadingType = (toastType as string) === 'loading';
    if (closeButton && !toast.jsx && !isLoadingType) {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', closeButtonAriaLabel);
      btn.setAttribute('data-disabled', 'false');
      btn.setAttribute('data-close-button', '');
      btn.className = cn(classNames?.closeButton, toast.classNames?.closeButton);
      if (icons?.close != null) {
        if (icons.close instanceof HTMLElement) btn.appendChild(icons.close.cloneNode(true));
        else btn.innerHTML = String(icons.close);
      } else {
        btn.innerHTML = CLOSE_SVG;
      }
      btn.addEventListener('click', () => {
        if (!dismissible) return;
        this.deleteToast(toast);
        toast.onDismiss?.(toast);
      });
      li.appendChild(btn);
    }

    // Icon container
    const showIcon =
      (toastType || toast.icon || toast.promise) &&
      toast.icon !== null &&
      (!icons || (toastType ? icons[toastType as keyof typeof icons] !== null : true) || toast.icon);
    if (showIcon && !toast.jsx) {
      const iconDiv = document.createElement('div');
      iconDiv.setAttribute('data-icon', '');
      iconDiv.className = cn(classNames?.icon, toast.classNames?.icon);

      if (toast.promise || (toast.type === 'loading' && !toast.icon)) {
        if (toast.icon) {
          if (toast.icon instanceof HTMLElement) iconDiv.appendChild(toast.icon.cloneNode(true));
          else iconDiv.innerHTML = String(toast.icon);
        } else if (icons?.loading) {
          const wrap = document.createElement('div');
          wrap.className = cn(classNames?.loader, toast.classNames?.loader, 'sonner-loader');
          wrap.setAttribute('data-visible', String(toastType === 'loading'));
          if (icons.loading instanceof HTMLElement) wrap.appendChild(icons.loading.cloneNode(true));
          else wrap.innerHTML = String(icons.loading);
          iconDiv.appendChild(wrap);
        } else {
          iconDiv.insertAdjacentHTML(
            'beforeend',
            buildLoaderHTML(toastType === 'loading', cn(classNames?.loader, toast.classNames?.loader) || undefined),
          );
        }
      }

      if (toast.type !== 'loading') {
        let iconHTML: string | HTMLElement | null = null;
        if (toast.icon) iconHTML = toast.icon;
        else if (toastType && icons?.[toastType as keyof typeof icons] != null) iconHTML = icons[toastType as keyof typeof icons] as any;
        else iconHTML = getAssetSvg(toastType);
        if (iconHTML) {
          if (iconHTML instanceof HTMLElement) iconDiv.appendChild(iconHTML.cloneNode(true));
          else iconDiv.insertAdjacentHTML('beforeend', iconHTML);
        }
      }
      // Re-insert fading loader clone so it animates out over the new icon
      if (fadingLoader) {
        iconDiv.insertBefore(fadingLoader, iconDiv.firstChild);
        setTimeout(() => fadingLoader!.remove(), 300);
      }

      li.appendChild(iconDiv);
    }

    // JSX (custom) short-circuit: render custom HTMLElement into a content wrapper
    if (toast.jsx) {
      const node = typeof toast.jsx === 'function' ? (toast.jsx as any)(toast.id) : toast.jsx;
      if (node instanceof HTMLElement) li.appendChild(node);
      return;
    }

    // Content
    const content = document.createElement('div');
    content.setAttribute('data-content', '');
    content.className = cn(classNames?.content, toast.classNames?.content);

    const titleEl = document.createElement('div');
    titleEl.setAttribute('data-title', '');
    titleEl.className = cn(classNames?.title, toast.classNames?.title);
    renderTitle(titleEl, toast.title, toast.id);
    content.appendChild(titleEl);

    if (toast.description != null) {
      const descEl = document.createElement('div');
      descEl.setAttribute('data-description', '');
      descEl.className = cn(
        toastOptions?.descriptionClassName,
        toast.descriptionClassName,
        classNames?.description,
        toast.classNames?.description,
      );
      renderTitle(descEl, toast.description, toast.id);
      content.appendChild(descEl);
    }
    li.appendChild(content);

    // Cancel button
    if (toast.cancel && isAction(toast.cancel)) {
      const b = document.createElement('button');
      b.setAttribute('data-button', '');
      b.setAttribute('data-cancel', '');
      applyStyle(b, toast.cancelButtonStyle || toastOptions?.cancelButtonStyle);
      b.className = cn(classNames?.cancelButton, toast.classNames?.cancelButton);
      b.textContent = toast.cancel.label;
      b.addEventListener('click', (event) => {
        if (!dismissible) return;
        toast.cancel!.onClick?.(event);
        this.deleteToast(toast);
      });
      li.appendChild(b);
    }

    // Action button
    if (toast.action && isAction(toast.action)) {
      const b = document.createElement('button');
      b.setAttribute('data-button', '');
      b.setAttribute('data-action', '');
      applyStyle(b, toast.actionButtonStyle || toastOptions?.actionButtonStyle);
      b.className = cn(classNames?.actionButton, toast.classNames?.actionButton);
      b.textContent = toast.action.label;
      b.addEventListener('click', (event) => {
        toast.action!.onClick?.(event);
        if (event.defaultPrevented) return;
        this.deleteToast(toast);
      });
      li.appendChild(b);
    }

    // After mutating content, re-measure height sync to avoid offset glitch (useLayoutEffect equivalent)
    const state2 = this.perToast.get(toast.id);
    if (state2 && state2.mounted) {
      const original = state2.el.style.height;
      state2.el.style.height = 'auto';
      const newH = state2.el.getBoundingClientRect().height;
      state2.el.style.height = original;
      if (Math.abs(newH - state2.initialHeight) > 0.5) {
        state2.initialHeight = newH;
        const idx = this.heights.findIndex((x) => x.toastId === toast.id);
        if (idx !== -1) this.heights[idx] = { ...this.heights[idx], height: newH };
        this.applyOffsets();
      }
    }
  }

  private attachPointerHandlers(toast: ToastT, li: HTMLLIElement) {
    const state = this.perToast.get(toast.id)!;
    const getDampening = (delta: number) => {
      const factor = Math.abs(delta) / 20;
      return 1 / (1.5 + factor);
    };

    li.addEventListener('dragend', () => {
      state.swiping = false;
      state.swipeDirection = null;
      state.pointerStart = null;
      li.setAttribute('data-swiping', 'false');
    });

    li.addEventListener('pointerdown', (event) => {
      if (event.button === 2) return;
      if (state.swiping) return; // ignore additional touch points mid-drag
      // Look up the current toast to avoid stale closures after updates (e.g. promise loading→success)
      const current = this.toasts.find((t) => t.id === toast.id);
      if (!current) return;
      const dismissible = current.dismissible !== false;
      const disabled = current.type === 'loading';
      if (disabled || !dismissible) return;
      state.dragStartTime = Date.now();
      state.offsetBeforeRemove = state.offset;
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      if ((event.target as HTMLElement).tagName === 'BUTTON') return;
      state.swiping = true;
      li.setAttribute('data-swiping', 'true');
      state.pointerStart = { x: event.clientX, y: event.clientY };
    });

    li.addEventListener('pointerup', () => {
      const current = this.toasts.find((t) => t.id === toast.id) ?? toast;
      const dismissible = current.dismissible !== false;
      if (state.swipeOut || !dismissible) return;
      state.pointerStart = null;
      const swipeAmountX = Number(li.style.getPropertyValue('--swipe-amount-x').replace('px', '') || 0);
      const swipeAmountY = Number(li.style.getPropertyValue('--swipe-amount-y').replace('px', '') || 0);
      const timeTaken = Date.now() - (state.dragStartTime ?? Date.now());
      const swipeAmount = state.swipeDirection === 'x' ? swipeAmountX : swipeAmountY;
      const velocity = Math.abs(swipeAmount) / Math.max(1, timeTaken);

      if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
        state.offsetBeforeRemove = state.offset;
        current.onDismiss?.(current);
        if (state.swipeDirection === 'x') {
          state.swipeOutDirection = swipeAmountX > 0 ? 'right' : 'left';
        } else {
          state.swipeOutDirection = swipeAmountY > 0 ? 'down' : 'up';
        }
        li.setAttribute('data-swipe-direction', state.swipeOutDirection);
        this.deleteToast(current);
        state.swipeOut = true;
        li.setAttribute('data-swipe-out', 'true');
        return;
      } else {
        li.style.setProperty('--swipe-amount-x', '0px');
        li.style.setProperty('--swipe-amount-y', '0px');
      }
      state.isSwiped = false;
      state.swiping = false;
      state.swipeDirection = null;
      li.setAttribute('data-swiped', 'false');
      li.setAttribute('data-swiping', 'false');
    });

    li.addEventListener('pointermove', (event) => {
      const current = this.toasts.find((t) => t.id === toast.id) ?? toast;
      const dismissible = current.dismissible !== false;
      if (!state.pointerStart || !dismissible) return;
      const sel = window.getSelection()?.toString();
      if (sel && sel.length > 0) return;

      const yDelta = event.clientY - state.pointerStart.y;
      const xDelta = event.clientX - state.pointerStart.x;

      const position = this.getToastPosition(toast);
      const swipeDirections = this.opts.swipeDirections ?? getDefaultSwipeDirections(position);

      if (!state.swipeDirection && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1)) {
        state.swipeDirection = Math.abs(xDelta) > Math.abs(yDelta) ? 'x' : 'y';
      }

      const swipeAmount = { x: 0, y: 0 };

      if (state.swipeDirection === 'y') {
        if (swipeDirections.includes('top') || swipeDirections.includes('bottom')) {
          if (
            (swipeDirections.includes('top') && yDelta < 0) ||
            (swipeDirections.includes('bottom') && yDelta > 0)
          ) {
            swipeAmount.y = yDelta;
          } else {
            const dampened = yDelta * getDampening(yDelta);
            swipeAmount.y = Math.abs(dampened) < Math.abs(yDelta) ? dampened : yDelta;
          }
        }
      } else if (state.swipeDirection === 'x') {
        if (swipeDirections.includes('left') || swipeDirections.includes('right')) {
          if (
            (swipeDirections.includes('left') && xDelta < 0) ||
            (swipeDirections.includes('right') && xDelta > 0)
          ) {
            swipeAmount.x = xDelta;
          } else {
            const dampened = xDelta * getDampening(xDelta);
            swipeAmount.x = Math.abs(dampened) < Math.abs(xDelta) ? dampened : xDelta;
          }
        }
      }

      if (Math.abs(swipeAmount.x) > 0 || Math.abs(swipeAmount.y) > 0) {
        state.isSwiped = true;
        li.setAttribute('data-swiped', 'true');
      }

      li.style.setProperty('--swipe-amount-x', `${swipeAmount.x}px`);
      li.style.setProperty('--swipe-amount-y', `${swipeAmount.y}px`);
    });
  }

  // --- Layout & timer ---

  private applyIndexAttrs() {
    // Re-index all toasts per position
    const byPos = new Map<Position, ToastT[]>();
    this.toasts.forEach((t) => {
      const p = this.getToastPosition(t);
      if (!byPos.has(p)) byPos.set(p, []);
      byPos.get(p)!.push(t);
    });
    byPos.forEach((list, pos) => {
      const visibleToasts = this.opts.visibleToasts ?? VISIBLE_TOASTS_AMOUNT;
      const frontHeight = this.heights.find((h) => h.position === pos)?.height ?? 0;

      list.forEach((t, index) => {
        const s = this.perToast.get(t.id);
        if (!s) return;
        const li = s.el;
        const isFront = index === 0;
        const isVisible = index + 1 <= visibleToasts;
        const wasFront = li.getAttribute('data-front') === 'true';

        if (s.mounted && !s.removed) {
          if (!isFront) {
            if (!this.expanded) {
              if (wasFront) {
                // First time going front → non-front: height is currently `auto` so CSS
                // has no concrete "from" value for the transition. Bridge the gap by pinning
                // the current rendered height inline, forcing a reflow so the browser
                // snapshots that value, then setting the target height.
                const currentH = li.getBoundingClientRect().height;
                li.style.height = `${currentH}px`;
                li.getBoundingClientRect(); // force reflow — establishes the "from" snapshot
              }
              // Pin non-front height when collapsed. In expanded mode, applyExpandedToToasts
              // manages each toast's own height — overwriting here would cause a visible jump
              // during the 200ms exit animation of a swiped toast.
              li.style.height = `${frontHeight}px`;
            }
          } else if (!wasFront) {
            // Becoming front again: the non-front inline height is still set.
            // Transition to this toast's natural height, then clear so auto takes over.
            li.style.height = `${s.initialHeight}px`;
            const toastId = t.id;
            setTimeout(() => {
              const latest = this.perToast.get(toastId);
              if (latest && !latest.removed && latest.el.getAttribute('data-front') === 'true') {
                latest.el.style.height = '';
              }
            }, 420);
          }
        }

        li.setAttribute('data-index', String(index));
        li.setAttribute('data-front', String(isFront));
        li.setAttribute('data-visible', String(isVisible));
        li.style.setProperty('--index', String(index));
        li.style.setProperty('--toasts-before', String(index));
        li.style.setProperty('--z-index', String(list.length - index));
      });

      // Update front-toast-height on the corresponding <ol>
      const ol = this.lists.get(pos);
      if (ol) ol.style.setProperty('--front-toast-height', `${frontHeight}px`);
    });
  }

  private computeOffsetForToast(toast: ToastT): number {
    const pos = this.getToastPosition(toast);
    const posHeights = this.heightsAtPosition(pos);
    const heightIndex = Math.max(0, posHeights.findIndex((h) => h.toastId === toast.id));
    let before = 0;
    for (let i = 0; i < heightIndex; i++) before += posHeights[i].height;
    return heightIndex * (this.opts.gap ?? GAP) + before;
  }

  private applyOffsets() {
    this.toasts.forEach((t) => {
      const s = this.perToast.get(t.id);
      if (!s) return;
      const off = this.computeOffsetForToast(t);
      s.offset = off;
      if (!s.removed) {
        s.el.style.setProperty('--offset', `${off}px`);
        s.el.style.setProperty(
          '--initial-height',
          this.opts.expand ? 'auto' : `${s.initialHeight}px`,
        );
      }
    });
    this.applyIndexAttrs();
  }

  private setExpanded(next: boolean) {
    if (next === this.expanded) return;
    // Avoid expand with <=1 toast
    if (next && this.toasts.length <= 1) return;
    this.expanded = next;
    this.applyExpandedToToasts();
    this.toasts.forEach((t) => this.updateTimer(t));
  }

  private applyExpandedToToasts() {
    this.toasts.forEach((t) => {
      const s = this.perToast.get(t.id);
      if (!s) return;
      const expandByDefault = Boolean(this.opts.expand);
      const value = Boolean(this.expanded || (expandByDefault && s.mounted));
      const isFront = s.el.getAttribute('data-front') === 'true';

      if (!isFront && s.mounted && !s.removed) {
        if (value) {
          // Refresh --initial-height to this toast's own content height before clearing
          // the inline height. applyOffsets may have run while this toast was non-front
          // (s.initialHeight correct) but a stale CSS var from a previous front toast's
          // height could linger. Rewrite ensures the expanded CSS rule sees the right value.
          s.el.style.setProperty(
            '--initial-height',
            this.opts.expand ? 'auto' : `${s.initialHeight}px`,
          );
          // Expanding: clear the inline height so CSS height:var(--initial-height) wins.
          s.el.style.height = '';
        } else {
          // Collapsing (or not expanding): re-pin inline height to frontHeight.
          // After an expand cycle the inline was cleared, so without re-pinning there
          // would be no explicit "from" value for the next --front-toast-height change.
          // Setting it here keeps every non-front toast height explicit at all times,
          // mirroring React Sonner's inline height: heights[0]?.height pattern.
          const pos = this.getToastPosition(t);
          const frontH = this.heights.find((h) => h.position === pos)?.height ?? 0;
          s.el.style.height = `${frontH}px`;
        }
      }

      s.el.setAttribute('data-expanded', String(value));
    });
  }

  private updateTimer(toast: ToastT) {
    const s = this.perToast.get(toast.id);
    if (!s) return;
    const toastType = toast.type;
    if ((toast.promise && toastType === 'loading') || toast.duration === Infinity || toastType === 'loading') {
      if (s.timeoutId) {
        clearTimeout(s.timeoutId);
        s.timeoutId = null;
      }
      return;
    }

    const pauseTimer = () => {
      if (s.lastCloseTimerStart < s.closeTimerStart) {
        const elapsed = Date.now() - s.closeTimerStart;
        s.remainingTime = s.remainingTime - elapsed;
      }
      s.lastCloseTimerStart = Date.now();
      if (s.timeoutId) {
        clearTimeout(s.timeoutId);
        s.timeoutId = null;
      }
    };

    const startTimer = () => {
      if (s.remainingTime === Infinity) return;
      if (s.timeoutId) clearTimeout(s.timeoutId);
      s.closeTimerStart = Date.now();
      s.timeoutId = setTimeout(() => {
        toast.onAutoClose?.(toast);
        this.deleteToast(toast);
      }, s.remainingTime);
    };

    // Reset remaining on duration change
    const newDuration = toast.duration || this.opts.duration || TOAST_LIFETIME;
    if (s.closeTimerStart === 0 && s.lastCloseTimerStart === 0) {
      s.remainingTime = newDuration;
    }

    if (this.expanded || this.interacting || this.isDocumentHidden) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  private deleteToast(toast: ToastT) {
    const s = this.perToast.get(toast.id);
    if (!s || s.removed) return;
    s.removed = true;
    s.offsetBeforeRemove = s.offset;
    s.el.setAttribute('data-removed', 'true');
    // Preserve offset for exit animation
    s.el.style.setProperty('--offset', `${s.offsetBeforeRemove}px`);

    // Remove from heights
    this.heights = this.heights.filter((h) => h.toastId !== toast.id);
    this.applyOffsets();

    if (s.timeoutId) clearTimeout(s.timeoutId);

    s.unmountTimeout = setTimeout(() => {
      this.removeFromDOM(toast);
    }, TIME_BEFORE_UNMOUNT);

    // Also reflect dismiss in ToastState
    if (!toast.delete) ToastState.dismiss(toast.id);
  }

  private removeFromDOM(toast: ToastT) {
    const s = this.perToast.get(toast.id);
    if (s) {
      s.resizeObserver?.disconnect();
      s.el.remove();
      this.perToast.delete(toast.id);
    }
    this.toasts = this.toasts.filter((t) => t.id !== toast.id);
    this.applyOffsets();
    // DOM and toasts list are fully updated here. If expanded during a swipe,
    // applyIndexAttrs pinned newly-visible toasts to frontHeight — fix them now
    // against the final stack. Collapse first if only one toast remains.
    if (this.toasts.length <= 1) {
      this.setExpanded(false);
    } else if (this.expanded) {
      this.applyExpandedToToasts();
    }
  }
}

export function createToaster(rootEl: HTMLElement, props: ToasterProps = {}): SonnerToaster {
  return new SonnerToaster({ rootEl, ...props });
}
