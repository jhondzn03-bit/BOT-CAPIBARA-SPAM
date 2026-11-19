import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(root, '.env') });

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function cleanPhone(value: string | undefined): string {
  return (value ?? '').replace(/[^\d]/g, '');
}

export const config = {
  root,
  prefix: process.env.BOT_PREFIX?.trim() || '.spam',
  phoneNumber: cleanPhone(process.env.BOT_PHONE_NUMBER),
  /** Código fijo de 8 dígitos (opcional). Evita que cambie cada minuto. */
  pairingCode: /^\d{8}$/.test(process.env.PAIRING_CODE?.trim() ?? '')
    ? process.env.PAIRING_CODE!.trim()
    : undefined,
  /** Usar el código nativo de Baileys en vez de uno numérico personalizado. */
  pairingStandard: process.env.PAIRING_STANDARD === '1',
  browserName: process.env.BOT_BROWSER_NAME?.trim() || 'Capibara',
  ownerNumber: cleanPhone(process.env.OWNER_NUMBER),
  paths: {
    auth: path.join(root, 'auth_info'),
    dataDir: path.join(root, 'storage'),
    dataFile: path.join(root, 'storage', 'db.json'),
    mediaDir: path.join(root, 'storage', 'media'),
  },
  limits: {
    sendDelayMs: Math.max(1500, int(process.env.SEND_DELAY_MS, 3000)),
    maxSendsPerGroupDay: int(process.env.MAX_SENDS_PER_GROUP_DAY, 4),
    maxGroupsPerCampaign: int(process.env.MAX_GROUPS_PER_CAMPAIGN, 20),
    requireAuthorization: (process.env.REQUIRE_GROUP_AUTHORIZATION ?? 'true').toLowerCase() !== 'false',
    autoRead: (process.env.AUTO_READ ?? 'true').toLowerCase() !== 'false',
  },
  logLevel: process.env.LOG_LEVEL?.trim() || 'info',
} as const;

export type Config = typeof config;
