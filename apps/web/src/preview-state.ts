export type PreviewFlag = 'richColors' | 'closeButton';

const flags: Record<PreviewFlag, boolean> = {
  richColors: false,
  closeButton: false,
};

let currentDuration: number = 5000;
let currentPosition: string = 'bottom-right';

export function getDuration(): number {
  return currentDuration;
}

export function setDuration(ms: number): void {
  currentDuration = ms;
  window.dispatchEvent(new CustomEvent('sonner-preview-change'));
}

export function getPosition(): string {
  return currentPosition;
}

export function setPosition(pos: string): void {
  currentPosition = pos;
  window.dispatchEvent(new CustomEvent('sonner-preview-change'));
}

export function getToastOpts(): Record<string, any> {
  const o: Record<string, any> = { duration: currentDuration, position: currentPosition };
  if (flags.richColors) o.richColors = true;
  if (flags.closeButton) o.closeButton = true;
  return o;
}

export function toggleFlag(key: PreviewFlag): boolean {
  flags[key] = !flags[key];
  window.dispatchEvent(new CustomEvent('sonner-preview-change'));
  return flags[key];
}

export function setFlag(key: PreviewFlag, value: boolean): void {
  flags[key] = value;
  window.dispatchEvent(new CustomEvent('sonner-preview-change'));
}

export function isOn(key: PreviewFlag): boolean {
  return flags[key];
}

/**
 * Builds per-toast options code snippet. `extra` = type-specific opts as code strings.
 * richColors and closeButton are Toaster-level — use toToasterCode() for those.
 */
export function toOptsCode(extra?: Record<string, string>): string {
  const lines: string[] = [];
  if (extra) {
    for (const [k, v] of Object.entries(extra)) lines.push(`  ${k}: ${v},`);
  }
  if (!lines.length) return '';
  return `, {\n${lines.join('\n')}\n}`;
}

/**
 * Returns `<Toaster .../>` config block for Toaster-level props (richColors, closeButton).
 */
export function toToasterCode(): string {
  const parts: string[] = [];
  if (flags.richColors) parts.push('richColors');
  if (flags.closeButton) parts.push('closeButton');
  if (!parts.length) return '';
  return `\n\n// ...\n\n<Toaster ${parts.join(' ')} />`;
}
