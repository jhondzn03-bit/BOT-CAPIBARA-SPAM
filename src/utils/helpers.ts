import type { WAMessage } from '@whiskeysockets/baileys';

/** Extrae el texto plano de un mensaje de WhatsApp. */
export function messageText(msg: WAMessage): string {
  const m = msg.message ?? {};
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    ''
  );
}

/** JID del remitente (o del grupo si es mensaje de grupo). */
export function senderJid(msg: WAMessage): string {
  return msg.key.remoteJid ?? '';
}

/** Solo dígitos de un JID/número. */
export function digits(value: string): string {
  return value.replace(/[^\d]/g, '');
}

/** Normaliza un JID: acepta número, JID de usuario o JID de grupo. */
export function normalizeJid(input: string): string {
  const value = input.trim().replace(/^@/, '');
  if (value.endsWith('@g.us') || value.endsWith('@s.whatsapp.net')) return value;
  const d = digits(value);
  return d.length >= 10 ? `${d}@s.whatsapp.net` : value;
}

/** Convierte un JID a número legible. */
export function jidToPhone(jid: string): string {
  return jid.split('@')[0];
}

/** Genera un ID corto aleatorio. */
export function shortId(prefix = ''): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${out}`;
}

/** Formatea marca de tiempo a fecha local legible. */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Tiempo transcurrido relativo (ej. "hace 3 h"). */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

/** Divide un array en chunks. */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Extrae el código de una invitación de grupo. */
export function inviteCode(input: string): string | null {
  const match = input.match(/(?:chat\.whatsapp\.com\/|invite=)([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const trimmed = input.trim();
  return /^[a-zA-Z0-9_-]{10,}$/.test(trimmed) ? trimmed : null;
}

/** Duerme N milisegundos. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Trunca un texto. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
