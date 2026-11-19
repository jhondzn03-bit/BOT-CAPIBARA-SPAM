import type { WASocket } from '@whiskeysockets/baileys';
import { store } from '../storage/Store';
import { broadcast } from './BroadcastService';
import { logger } from '../utils/logger';

/**
 * Revisa las campañas programadas cada 20 segundos y las envía cuando llega su hora.
 * El socket se obtiene mediante callback porque cambia tras cada reconexión.
 */
export function startScheduler(getSock: () => WASocket | undefined): NodeJS.Timeout {
  const timer = setInterval(async () => {
    const now = Date.now();
    const due = store.listScheduled().filter((s) => s.status === 'pendiente' && s.executeAt <= now);

    for (const item of due) {
      const campaign = store.getCampaign(item.campaignId);
      const sock = getSock();
      if (!campaign || !sock) {
        item.status = 'cancelada';
        store.upsertScheduled(item);
        continue;
      }

      try {
        const result = await broadcast(sock, campaign);
        if (item.repeatMinutes && item.repeatMinutes > 0) {
          item.executeAt = Date.now() + item.repeatMinutes * 60_000;
          item.status = 'pendiente';
        } else {
          item.status = 'enviada';
        }
        store.upsertScheduled(item);
        store.audit('campana.programada', `${campaign.id} enviada automáticamente (${result.sent} grupos)`, 'scheduler');
        logger.info({ campaign: campaign.id, sent: result.sent }, 'Campaña programada enviada');
      } catch (err) {
        logger.warn({ err, campaign: campaign.id }, 'Falló campaña programada');
      }
    }
  }, 20_000);

  timer.unref();
  return timer;
}
