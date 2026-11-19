/**
 * Identidad visual oficial de 🦫 BOT CAPIBARA SPAM.
 * Paleta: marrón, beige y crema. Tipografía Unicode decorativa.
 */

export const THEME = {
  name: '🦫 𝐁𝐎𝐓 𝐂𝐀𝐏𝐈𝐁𝐀𝐑𝐀 𝐒𝐏𝐀𝐌',
  shortName: '🦫 𝐂𝐀𝐏𝐈𝐁𝐀𝐑𝐀',
  version: '1.0.0',
  colors: {
    brown: '#8B5A2B',
    beige: '#D2B48C',
    cream: '#FFFDD0',
  },
  ansi: {
    brown: '\x1b[38;2;139;90;43m',
    beige: '\x1b[38;2;210;180;140m',
    cream: '\x1b[38;2;255;253;208m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
  },
  emoji: {
    capibara: '🦫',
    leaf: '🌿',
    water: '💧',
    orange: '🧡',
    pin: '📌',
    mail: '📨',
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
    sticker: '🎴',
    edit: '✏️',
    eye: '👁️',
    save: '💾',
    check: '✅',
    cross: '❌',
    warn: '⚠️',
    lock: '🔐',
    chart: '📊',
    gear: '⚙️',
    sparkle: '✨',
  },
} as const;

/** Convierte texto a negrita matemática Unicode. */
export function toBold(text: string): string {
  const map: Record<string, string> = {
    a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠', h: '𝐡', i: '𝐢',
    j: '𝐣', k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧', o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫',
    s: '𝐬', t: '𝐭', u: '𝐮', v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳',
    A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇', I: '𝐈',
    J: '𝐉', K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑',
    S: '𝐒', T: '𝐓', U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒',
    '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
  };
  return [...text].map((c) => map[c] ?? c).join('');
}

/** Convierte texto a cursiva matemática Unicode. */
export function toItalic(text: string): string {
  const map: Record<string, string> = {
    a: '𝑎', b: '𝑏', c: '𝑐', d: '𝑑', e: '𝑒', f: '𝑓', g: '𝑔', h: 'ℎ', i: '𝑖',
    j: '𝑗', k: '𝑘', l: '𝑙', m: '𝑚', n: '𝑛', o: '𝑜', p: '𝑝', q: '𝑞', r: '𝑟',
    s: '𝑠', t: '𝑡', u: '𝑢', v: '𝑣', w: '𝑤', x: '𝑥', y: '𝑦', z: '𝑧',
    A: '𝐴', B: '𝐵', C: '𝐶', D: '𝐷', E: '𝐸', F: '𝐹', G: '𝐺', H: '𝐻', I: '𝐼',
    J: '𝐽', K: '𝐾', L: '𝐿', M: '𝑀', N: '𝑁', O: '𝑂', P: '𝑃', Q: '𝑄', R: '𝑅',
    S: '𝑆', T: '𝑇', U: '𝑈', V: '𝑉', W: '𝑊', X: '𝑋', Y: '𝑌', Z: '𝑍',
  };
  return [...text].map((c) => map[c] ?? c).join('');
}

/** Convierte texto a estilo "script" (caligrafía) Unicode. */
export function toScript(text: string): string {
  const map: Record<string, string> = {
    a: '𝒂', b: '𝒃', c: '𝒄', d: '𝒅', e: '𝒆', f: '𝒇', g: '𝒈', h: '𝒉', i: '𝒊',
    j: '𝒋', k: '𝒌', l: '𝒍', m: '𝒎', n: '𝒏', o: '𝒐', p: '𝒑', q: '𝒒', r: '𝒓',
    s: '𝒔', t: '𝒕', u: '𝒖', v: '𝒗', w: '𝒘', x: '𝒙', y: '𝒚', z: '𝒛',
    A: '𝒜', B: 'ℬ', C: '𝒞', D: '𝒟', E: 'ℰ', F: 'ℱ', G: '𝒢', H: 'ℋ', I: 'ℐ',
    J: '𝒥', K: '𝒦', L: 'ℒ', M: 'ℳ', N: '𝒩', O: '𝒪', P: '𝒫', Q: '𝒬', R: 'ℛ',
    S: '𝒮', T: '𝒯', U: '𝒰', V: '𝒱', W: '𝒲', X: '𝒳', Y: '𝒴', Z: '𝒵',
  };
  return [...text].map((c) => map[c] ?? c).join('');
}

/** Barra decorativa. */
export function divider(width = 34): string {
  return '╰' + '━'.repeat(width) + '╯';
}

export function topDivider(width = 34): string {
  return '╭' + '━'.repeat(width) + '╮';
}
