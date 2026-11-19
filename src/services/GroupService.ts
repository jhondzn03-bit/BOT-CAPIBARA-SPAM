import type { WASocket } from '@whiskeysockets/baileys';
import { store } from '../storage/Store';
import type { GroupRecord } from '../types';
import { normalizeJid } from '../utils/helpers';
import { logger } from '../utils/logger';

export class GroupService {
  /** Registra un grupo manualmente. */
  add(jid: string, name?: string): GroupRecord {
    const normalized = normalizeJid(jid);
    const existing = store.getGroup(normalized);
    if (existing) return existing;

    const group: GroupRecord = {
      id: normalized,
      name: name ?? normalized.split('@')[0],
      status: 'pendiente',
      selected: true,
      addedAt: Date.now(),
      sendsToday: 0,
    };
    store.upsertGroup(group);
    store.audit('grupo.add', `Registrado ${group.id}`, 'sistema');
    return group;
  }

  remove(jid: string): boolean {
    const id = normalizeJid(jid);
    const removed = store.removeGroup(id);
    if (removed) store.audit('grupo.remove', `Eliminado ${id}`, 'sistema');
    return removed;
  }

  setStatus(jid: string, status: GroupRecord['status']): GroupRecord | undefined {
    const id = normalizeJid(jid);
    const group = store.getGroup(id);
    if (!group) return undefined;
    group.status = status;
    if (status === 'autorizado') group.authorizedAt = Date.now();
    store.upsertGroup(group);
    store.audit(`grupo.${status}`, `${id} -> ${status}`, 'sistema');
    return group;
  }

  /** Autoriza todos los grupos registrados de una vez. */
  authorizeAll(): number {
    let count = 0;
    for (const group of store.listGroups()) {
      if (group.status === 'autorizado' && group.selected) continue;
      group.status = 'autorizado';
      group.selected = true;
      group.authorizedAt = Date.now();
      store.upsertGroup(group);
      count++;
    }
    store.audit('grupo.autorizar.todos', `${count} grupos autorizados`, 'sistema');
    return count;
  }

  toggleSelect(jid: string): GroupRecord | undefined {
    const id = normalizeJid(jid);
    const group = store.getGroup(id);
    if (!group) return undefined;
    group.selected = !group.selected;
    store.upsertGroup(group);
    return group;
  }

  /** Sincroniza los grupos de los que el bot es miembro con Baileys. */
  async syncFromBaileys(sock: WASocket): Promise<number> {
    let synced = 0;
    try {
      const groups = await sock.groupFetchAllParticipating();
      for (const [jid, meta] of Object.entries(groups)) {
        const existing = store.getGroup(jid);
        const group: GroupRecord = {
          id: jid,
          name: meta.subject || existing?.name || jid.split('@')[0],
          subject: meta.subject,
          participants: meta.participants?.length,
          status: existing?.status ?? 'pendiente',
          selected: existing?.selected ?? true,
          addedAt: existing?.addedAt ?? Date.now(),
          authorizedAt: existing?.authorizedAt,
          lastSentAt: existing?.lastSentAt,
          sendsToday: existing?.sendsToday ?? 0,
          notes: existing?.notes,
        };
        if (!existing || existing.name !== group.name) synced++;
        store.upsertGroup(group);
      }
      store.audit('grupo.sync', `Sincronizados ${Object.keys(groups).length} grupos`, 'sistema');
    } catch (err) {
      logger.warn({ err }, 'No se pudo sincronizar grupos desde Baileys');
    }
    return synced;
  }

  /** Verifica si el bot sigue siendo miembro del grupo. */
  async verify(sock: WASocket, jid: string): Promise<{ member: boolean; info?: string }> {
    const id = normalizeJid(jid);
    try {
      const metadata = await sock.groupMetadata(id);
      const botId = sock.user?.id?.split(':')[0];
      const members = metadata.participants.map((p) => p.id.split(':')[0]);
      const member = botId ? members.includes(botId) : false;
      return {
        member,
        info: `${metadata.subject} · ${metadata.participants.length} participantes`,
      };
    } catch {
      return { member: false, info: 'No se pudo obtener información (¿el bot salió del grupo?)' };
    }
  }

  /** Intenta unirse a un grupo mediante código de invitación. */
  async join(sock: WASocket, code: string): Promise<{ ok: boolean; message: string; jid?: string }> {
    try {
      let info: { id?: string; subject?: string; size?: number } | undefined;
      try {
        info = await sock.groupGetInviteInfo(code);
      } catch {
        /* algunos servidores no exponen la info; continuamos igual */
      }

      const result = await sock.groupAcceptInvite(code);
      const jid = typeof result === 'string' ? result : (info?.id ?? `${code}@g.us`);

      const existing = store.getGroup(jid);
      store.upsertGroup({
        id: jid,
        name: info?.subject ?? existing?.name ?? code,
        subject: info?.subject,
        participants: info?.size,
        status: existing?.status ?? 'pendiente',
        selected: true,
        addedAt: existing?.addedAt ?? Date.now(),
        sendsToday: existing?.sendsToday ?? 0,
      });
      store.audit('grupo.unir', `Unido a ${jid}`, 'sistema');
      return { ok: true, jid, message: `Unido correctamente a ${info?.subject ?? jid}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      logger.warn({ err }, 'Error al unirse al grupo');
      return { ok: false, message };
    }
  }

  /** Grupos elegibles para campañas. */
  eligible(): GroupRecord[] {
    return store.listGroups().filter((g) => g.status === 'autorizado' && g.selected);
  }
}

export const groups = new GroupService();
