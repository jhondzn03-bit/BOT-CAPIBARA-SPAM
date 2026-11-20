import type { WASocket } from '@whiskeysockets/baileys';
import { store } from '../storage/Store';
import type { Campaign } from '../types';
import { sleep } from '../utils/helpers';
import { logger } from '../utils/logger';
import { buildMessagePayload } from './MediaService';

export interface BroadcastResult {
  sent: number;
  failed: number;
  skipped: string[];
  /** Grupos a los que se envió el mensaje (para el comprobante). */
  sentGroups: Array<{ id: string; name: string }>;
}

/** Evita que un envío manual y uno programado se solapen y dupliquen mensajes. */
let sending = false;

/** Duración legible para los avisos de omisión. */
function humanMs(ms: number): string {
  if (ms < 60_000) return `${Math.ceil(ms / 1000)} s`;
  if (ms < 3_600_000) return `${Math.ceil(ms / 60_000)} min`;
  return `${Math.ceil(ms / 3_600_000)} h`;
}

/**
 * Envía una campaña SOLO a grupos autorizados y seleccionados.
 * Incluye: anti-duplicados por campaña+grupo, límite diario, retardo entre
 * envíos y registro de auditoría.
 */
export async function broadcast(sock: WASocket, campaign: Campaign): Promise<BroadcastResult> {
  const result: BroadcastResult = { sent: 0, failed: 0, skipped: [], sentGroups: [] };

  if (store.isPaused()) {
    logger.warn('Envío omitido: envíos detenidos globalmente');
    return result;
  }

  if (sending) {
    result.skipped.push('ya hay otro envío en curso (omitido para evitar duplicados)');
    logger.warn('Envío concurrente omitido');
    return result;
  }
  sending = true;

  try {
    const settings = store.settings;
    store.refreshDailyCounters();

    const now = Date.now();
    const cooldownMs = settings.groupCooldownMs;

    const eligible = store.listGroups().filter((g) => {
      if (g.status !== 'autorizado') {
        result.skipped.push(`${g.name}: no autorizado`);
        return false;
      }
      if (!g.selected) {
        result.skipped.push(`${g.name}: no seleccionado`);
        return false;
      }

      // --- Anti-duplicados: misma campaña + mismo grupo ---
      const last = store.lastDelivery(campaign.id, g.id);
      if (last !== undefined && cooldownMs > 0 && now - last < cooldownMs) {
        const restante = cooldownMs - (now - last);
        result.skipped.push(
          `${g.name}: ya se envió hace ${humanMs(now - last)} · faltan ${humanMs(restante)}`,
        );
        return false;
      }

      if (settings.maxSendsPerGroupDay > 0 && g.sendsToday >= settings.maxSendsPerGroupDay) {
        result.skipped.push(`${g.name}: límite diario alcanzado`);
        return false;
      }
      return true;
    }).slice(0, settings.maxGroupsPerCampaign > 0 ? settings.maxGroupsPerCampaign : undefined);

    if (!eligible.length) return result;

    const payload = buildMessagePayload(
      campaign.type,
      campaign.content.mediaPath,
      campaign.content.fileName,
      campaign.content.caption ?? campaign.content.text,
      { button: campaign.content.button, linkPreview: campaign.content.linkPreview },
    );

    for (const group of eligible) {
      // Si detienen el bot a mitad de campaña, no se envía nada más.
      if (store.isPaused()) {
        result.skipped.push(`${group.name}: envíos detenidos`);
        for (const rest of eligible.slice(eligible.indexOf(group) + 1)) {
          result.skipped.push(`${rest.name}: envíos detenidos`);
        }
        logger.warn('Envío interrumpido: envíos detenidos globalmente');
        break;
      }
      try {
        await sock.sendMessage(group.id, payload as never);
        // Se marca ANTES del sleep para que otro tick no vuelva a enviarlo.
        store.markDelivered(campaign.id, group.id);
        group.sendsToday += 1;
        group.lastSentAt = Date.now();
        store.upsertGroup(group);
        result.sent++;
        result.sentGroups.push({ id: group.id, name: group.name });
        logger.info({ group: group.id }, `Anuncio enviado (${campaign.id})`);
      } catch (err) {
        result.failed++;
        logger.warn({ err, group: group.id }, 'Falló el envío');
      }
      await sleep(settings.sendDelayMs);
    }

    if (result.sent > 0) campaignsMark(campaign.id, result.sent);
    return result;
  } finally {
    sending = false;
  }
}

function campaignsMark(id: string, count: number): void {
  const campaign = store.getCampaign(id);
  if (!campaign) return;
  campaign.status = 'enviada';
  campaign.sentAt = Date.now();
  campaign.sentCount = count;
  campaign.totalSent = (campaign.totalSent ?? store.countAuditSends(campaign.id)) + count;
  campaign.updatedAt = Date.now();
  store.upsertCampaign(campaign);
  store.audit('campana.send', `${id} enviada a ${count} grupos`, 'sistema');
}
