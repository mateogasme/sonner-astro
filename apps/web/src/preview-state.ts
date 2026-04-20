export type PreviewFlag = 'richColors' | 'closeButton' | 'action' | 'cancel';

const flags: Record<PreviewFlag, boolean> = {
  richColors: false,
  closeButton: false,
  action: false,
  cancel: false,
};

export function getToastOpts(): Record<string, any> {
  const o: Record<string, any> = {};
  if (flags.richColors) o.richColors = true;
  if (flags.closeButton) o.closeButton = true;
  if (flags.action) o.action = { label: 'Action', onClick: () => {} };
  if (flags.cancel) o.cancel = { label: 'Cancel', onClick: () => {} };
  return o;
}

export function toggleFlag(key: PreviewFlag): boolean {
  flags[key] = !flags[key];
  window.dispatchEvent(new CustomEvent('sonner-preview-change'));
  return flags[key];
}

export function isOn(key: PreviewFlag): boolean {
  return flags[key];
}

/**
 * Builds the options code snippet to append to a toast call.
 * `extra` = type-specific options (e.g. { description: "'Monday...'" }) as code strings.
 * Global flags are appended after.
 */
export function toOptsCode(extra?: Record<string, string>): string {
  const lines: string[] = [];
  if (extra) {
    for (const [k, v] of Object.entries(extra)) lines.push(`  ${k}: ${v},`);
  }
  if (flags.richColors) lines.push('  richColors: true,');
  if (flags.closeButton) lines.push('  closeButton: true,');
  if (flags.action) lines.push("  action: { label: 'Action', onClick: () => {} },");
  if (flags.cancel) lines.push("  cancel: { label: 'Cancel', onClick: () => {} },");
  if (!lines.length) return '';
  return `, {\n${lines.join('\n')}\n}`;
}
