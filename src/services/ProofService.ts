import type { WASocket } from '@whiskeysockets/baileys';
import { config } from '../config';
import type { Campaign } from '../types';
import { formatDate } from '../utils/helpers';
import { logger } from '../utils/logger';
import { buildProofImage } from '../utils/proofImage';
import type { BroadcastResult } from './BroadcastService';

/**
 * Envía una imagen tipo captura con la evidencia de los grupos alcanzados.
 * SOLO al número configurado en PROOF_NUMBER (nunca a los grupos).
 */
export async function sendProof(sock: WASocket, campaign: Campaign, result: BroadcastResult): Promise<void> {
  if (result.sent <= 0 || !config.proofNumber) return;
  try {
    const lines = [
      `CAMPAÑA: ${campaign.name}`,
      `ID: ${campaign.id}`,
      `FECHA: ${formatDate(Date.now())}`,
      `ENVIADOS: ${result.sent} GRUPOS`,
      `FALLIDOS: ${result.failed} / OMITIDOS: ${result.skipped.length}`,
      '',
      'GRUPOS:',
      ...result.sentGroups.map((g, i) => `${String(i + 1).padStart(2, '0')}. ${g.name}`),
    ];
    const image = buildProofImage('COMPROBANTE DE ENVIO', lines, [3]);
    const jid = `${config.proofNumber}@s.whatsapp.net`;
    await sock.sendMessage(jid, { image, caption: `🦫 Evidencia: ${result.sent} mensajes enviados` });
    logger.info({ jid, sent: result.sent }, 'Comprobante enviado al número configurado');
  } catch (err) {
    logger.warn({ err }, 'No se pudo enviar el comprobante');
  }
}
