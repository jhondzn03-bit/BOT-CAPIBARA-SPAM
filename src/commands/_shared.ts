import { store } from '../storage/Store';
import type { CommandContext, GroupRecord } from '../types';
import { digits, normalizeJid } from '../utils/helpers';

/** Resuelve un grupo a partir de JID, número, índice de lista o nombre parcial. */
export function resolveGroup(ctx: CommandContext, input: string): GroupRecord | undefined {
  const value = input.trim();
  if (!value) return undefined;

  const all = store.listGroups();

  // Por índice numérico de la lista.
  if (/^\d+$/.test(value)) {
    const index = Number(value) - 1;
    if (index >= 0 && index < all.length) return all[index];
  }

  // Por JID exacto / número.
  const jid = normalizeJid(value);
  const exact = store.getGroup(jid);
  if (exact) return exact;

  const d = digits(value);
  const byPhone = all.find((g) => digits(g.id) === d && d.length > 0);
  if (byPhone) return byPhone;

  // Por nombre (coincidencia parcial, sin importar mayúsculas).
  const needle = value.toLowerCase();
  return all.find((g) => g.name.toLowerCase().includes(needle));
}

/** Extrae un JID de un mensaje citado o del propio mensaje. */
export function jidFromContext(ctx: CommandContext): string | undefined {
  const quoted = ctx.quoted;
  if (quoted) {
    const participant = quoted.key.participant ?? quoted.key.remoteJid;
    if (quoted.key.remoteJid?.endsWith('@g.us') && participant) return participant;
    if (participant) return participant;
  }
  return ctx.sender;
}
