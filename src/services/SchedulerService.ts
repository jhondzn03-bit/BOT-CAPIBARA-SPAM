import type { WASocket } from '@whiskeysockets/baileys';
import { store } from '../storage/Store';
import { broadcast } from './BroadcastService';
import { sendProof } from './ProofService';
import { logger } from '../utils/logger';

/** Evita que dos ticks del scheduler se ejecuten al mismo tiempo. */
let tickRunning = false;

/**
 * Revisa las campañas programadas cada 20 segundos y las envía cuando llega su hora.
 * El socket se obtiene mediante callback porque cambia tras cada reconexión.
 */
export function startScheduler(getSock: () => WASocket | undefined): NodeJS.Timeout {
  const timer = setInterval(async () => {
    if (tickRunning) return;
    tickRunning = true;

    try {
      // Con los envíos detenidos no se consumen las programaciones: se retoman al reanudar.
      if (store.isPaused()) return;

      const now = Date.now();
      const vistas = new Set<string>();

      // Solo una programación por campaña por tick: evita 2-3 mensajes seguidos
      // cuando el usuario creó varias repeticiones de la misma campaña.
      const due = store.listScheduled().filter((s) => {
        if (s.status !== 'pendiente' || s.executeAt > now) return false;
        if (vistas.has(s.campaignId)) {
          if (s.repeatMinutes && s.repeatMinutes > 0) {
            s.executeAt = Date.now() + s.repeatMinutes * 60_000;
          } else {
            s.executeAt = Date.now();
            s.status = 'enviada';
          }
          store.upsertScheduled(s);
          store.audit('programa.duplicado', `${s.campaignId} (${s.id}) omitida: ya hay otra programación activa`, 'scheduler');
          return false;
        }
        vistas.add(s.campaignId);
        return true;
      });

      for (const item of due) {
        const campaign = store.getCampaign(item.campaignId);
        const sock = getSock();
        if (!campaign || !sock) {
          store.removeScheduled(item.id);
          store.audit('programa.eliminada', `${item.id} eliminada: campaña o socket no disponible`, 'scheduler');
          continue;
        }

        // Avanzar ANTES de enviar: si el envío tarda, el siguiente tick no la retoma.
        if (item.repeatMinutes && item.repeatMinutes > 0) {
          item.executeAt = Date.now() + item.repeatMinutes * 60_000;
          item.status = 'pendiente';
        } else {
          item.status = 'enviada';
        }
        store.upsertScheduled(item);

        try {
          const result = await broadcast(sock, campaign);
          await sendProof(sock, campaign, result);
          store.audit('campana.programada', `${campaign.id} enviada automáticamente (${result.sent} grupos, ${result.skipped.length} omitidos)`, 'scheduler');
          logger.info({ campaign: campaign.id, sent: result.sent }, 'Campaña programada enviada');
        } catch (err) {
          logger.warn({ err, campaign: campaign.id }, 'Falló campaña programada');
        }
      }
    } finally {
      tickRunning = false;
    }
  }, 20_000);

  timer.unref();
  return timer;
}
