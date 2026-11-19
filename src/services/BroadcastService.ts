import type { WASocket } from '@whiskeysockets/baileys';
import { store } from '../storage/Store';
import type { Campaign } from '../types';
import { sleep } from '../utils/helpers';
import { logger } from '../utils/logger';
import { globalLimiter } from '../utils/rateLimiter';
import { buildMessagePayload } from './MediaService';

export interface BroadcastResult {
  sent: number;
  failed: number;
  skipped: string[];
}

/**
 * Envía una campaña SOLO a grupos autorizados y seleccionados.
 * Incluye: límite diario por grupo, retardo entre envíos y registro de auditoría.
 */
export async function broadcast(sock: WASocket, campaign: Campaign): Promise<BroadcastResult> {
  const result: BroadcastResult = { sent: 0, failed: 0, skipped: [] };
  const settings = store.settings;
  store.refreshDailyCounters();

  const eligible = store.listGroups().filter((g) => {
    if (g.status !== 'autorizado') {
      result.skipped.push(`${g.name}: no autorizado`);
      return false;
    }
    if (!g.selected) {
      result.skipped.push(`${g.name}: no seleccionado`);
      return false;
    }
    if (settings.maxSendsPerGroupDay > 0 && g.sendsToday >= settings.maxSendsPerGroupDay) {
      result.skipped.push(`${g.name}: límite diario alcanzado`);
      return false;
    }
    const windowMs = 60 * 60 * 1000;
    if (!globalLimiter.check(`broadcast:${g.id}`, 60, windowMs)) {
      result.skipped.push(`${g.name}: límite por hora alcanzado`);
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
    try {
      await sock.sendMessage(group.id, payload as never);
      group.sendsToday += 1;
      group.lastSentAt = Date.now();
      store.upsertGroup(group);
      result.sent++;
      logger.info({ group: group.id }, `Anuncio enviado (${campaign.id})`);
    } catch (err) {
      result.failed++;
      logger.warn({ err, group: group.id }, 'Falló el envío');
    }
    await sleep(settings.sendDelayMs);
  }

  if (result.sent > 0) campaignsMark(campaign.id, result.sent);
  return result;
}

function campaignsMark(id: string, count: number): void {
  const campaign = store.getCampaign(id);
  if (!campaign) return;
  campaign.status = 'enviada';
  campaign.sentAt = Date.now();
  campaign.sentCount = count;
  campaign.updatedAt = Date.now();
  store.upsertCampaign(campaign);
  store.audit('campana.send', `${id} enviada a ${count} grupos`, 'sistema');
}
