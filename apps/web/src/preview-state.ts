export type PreviewFlag = 'closeButton';
export type ColorMode = 'off' | 'iconColors' | 'richBackground' | 'richColors';

const flags: Record<PreviewFlag, boolean> = {
  closeButton: false,
};

let colorMode: ColorMode = 'off';
let currentDuration: number = 5000;
let currentPosition: string = 'bottom-right';

export function getColorMode(): ColorMode {
  return colorMode;
}

export function setColorMode(mode: ColorMode): void {
  colorMode = mode;
  window.dispatchEvent(new CustomEvent('sonner-preview-change'));
}

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
  if (colorMode === 'richColors')     o.richColors     = true;
  if (colorMode === 'richBackground') o.richBackground = true;
  if (colorMode === 'iconColors')     o.iconColors     = true;
  if (flags.closeButton) o.closeButton = true;
  return o;
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
 * Returns `<Toaster .../>` config block for Toaster-level props.
 */
export function toToasterCode(): string {
  const parts: string[] = [];
  if (colorMode === 'richColors')     parts.push('richColors');
  if (colorMode === 'richBackground') parts.push('richBackground');
  if (colorMode === 'iconColors')     parts.push('iconColors');
  if (flags.closeButton) parts.push('closeButton');
  if (!parts.length) return '';
  return `\n\n// ...\n\n<Toaster ${parts.join(' ')} />`;
}
