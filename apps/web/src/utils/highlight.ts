const KEYWORDS = new Set([
  'import', 'from', 'export', 'default', 'const', 'let', 'var', 'function',
  'return', 'new', 'async', 'await', 'typeof', 'instanceof', 'if', 'else',
  'for', 'while', 'class', 'extends', 'this', 'null', 'undefined', 'void',
  'of', 'in', 'try', 'catch', 'throw', 'switch', 'case', 'break',
]);

// Capitalized words that are actual JS/TS types/classes, not HTML text
const JS_TYPES = new Set([
  'Promise', 'Error', 'Array', 'Object', 'Map', 'Set', 'Date', 'RegExp',
  'Boolean', 'Number', 'String', 'Symbol', 'BigInt', 'Function',
]);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = (cls: string, text: string) =>
  `<span class="hl-${cls}">${esc(text)}</span>`;

export function highlight(code: string): string {
  let i = 0;
  let out = '';

  while (i < code.length) {
    const ch = code[i];

    // HTML comment: <!-- ... -->
    if (ch === '<' && code[i + 1] === '!' && code[i + 2] === '-' && code[i + 3] === '-') {
      const end = code.indexOf('-->', i + 4);
      const s = end === -1 ? code.slice(i) : code.slice(i, end + 3);
      out += span('cm', s);
      i += s.length;
      continue;
    }

    // Single-line comment
    if (ch === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const s = end === -1 ? code.slice(i) : code.slice(i, end);
      out += span('cm', s);
      i += s.length;
      continue;
    }

    // Strings: ' " `
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === ch) { j++; break; }
        j++;
      }
      out += span('st', code.slice(i, j));
      i = j;
      continue;
    }

    // Identifier / keyword / function call
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);

      // Peek past whitespace to detect function call
      let k = j;
      while (k < code.length && code[k] === ' ') k++;
      const isCall = code[k] === '(';

      if (word === 'true' || word === 'false') {
        out += span('bl', word);
      } else if (KEYWORDS.has(word)) {
        out += span('kw', word);
      } else if (isCall) {
        out += span('fn', word);
      } else if (JS_TYPES.has(word)) {
        // Only known JS built-in types get class color — avoids false positives in HTML text
        out += span('cn', word);
      } else {
        out += esc(word);
      }
      i = j;
      continue;
    }

    // Number
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < code.length && /[0-9.]/.test(code[j])) j++;
      out += span('nm', code.slice(i, j));
      i = j;
      continue;
    }

    // JSX/HTML tag opening bracket: < followed by letter or /
    if (ch === '<' && /[a-zA-Z/]/.test(code[i + 1] ?? '')) {
      out += span('tg', '<');
      i++;
      continue;
    }

    // All other characters (including > / . , ; etc.)
    out += esc(ch);
    i++;
  }

  return out;
}
