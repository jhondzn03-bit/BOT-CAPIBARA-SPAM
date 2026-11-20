import {
  Browsers,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';
import { randomInt } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pino from 'pino';
import QRCode from 'qrcode';
import { config } from '../config';
import { THEME } from '../config/theme';
import { groups } from '../services/GroupService';
import { startScheduler } from '../services/SchedulerService';
import { store } from '../storage/Store';
import { sleep } from '../utils/helpers';
import { banner, logger } from '../utils/logger';
import { Handler, shouldReconnect } from './Handler';

type AuthState = Awaited<ReturnType<typeof useMultiFileAuthState>>['state'];
type SaveCreds = Awaited<ReturnType<typeof useMultiFileAuthState>>['saveCreds'];

const silentLogger = pino({ level: 'silent' });
let pairingRequested = false;
let handler: Handler | undefined;
let currentSock: WASocket | undefined;

/**
 * Solicita un código NUMÉRICO de 8 dígitos.
 * Debe llamarse cuando Baileys emite el evento `qr`: es la señal de que el
 * socket ya está listo. Pedirlo antes cierra la conexión con 401.
 */
async function requestPairingCode(sock: WASocket, phone: string): Promise<void> {
  pairingRequested = true;
  try {
    let code: string;
    if (config.pairingStandard) {
      // Código nativo de Baileys/WhatsApp (8 caracteres Crockford).
      code = await sock.requestPairingCode(phone);
    } else {
      // Código numérico de 8 dígitos (fijo si se definió PAIRING_CODE).
      const custom = config.pairingCode ?? String(randomInt(10_000_000, 99_999_999));
      try {
        code = await sock.requestPairingCode(phone, custom);
      } catch {
        code = await sock.requestPairingCode(phone);
      }
    }

    const pretty = formatPairingCode(code);
    console.log(`\n${THEME.emoji.lock} ${THEME.emoji.sparkle} CÓDIGO DE VINCULACIÓN (8 DÍGITOS)`);
    console.log(`\x1b[1m\x1b[38;2;139;90;43m        ${pretty}        \x1b[0m\n`);
    console.log('WhatsApp > Dispositivos vinculados > Vincular con número de teléfono\n');

    await fs.writeFile(
      path.join(config.root, 'codigo-vinculacion.txt'),
      `${pretty}\n\nWhatsApp > Dispositivos vinculados > Vincular con número de teléfono\n`,
      'utf8',
    );
    store.audit('vinculacion', `Código ${pretty} generado para ${phone}`, 'sistema');
  } catch (err) {
    logger.warn({ err }, 'No se pudo solicitar el código de vinculación');
  }
}

/** Formatea un código de 8 caracteres como XXXX-XXXX. */
function formatPairingCode(code: string): string {
  const clean = code.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

export async function startBot(): Promise<void> {
  banner();
  await store.init();

  const { state, saveCreds } = await useMultiFileAuthState(config.paths.auth);
  const version = await resolveVersion();

  logger.info(`Versión de WhatsApp: ${version.join('.')}`);
  startScheduler(() => currentSock);
  await connect(state, saveCreds, version);

  process.on('SIGINT', async () => {
    logger.info('Cerrando BOT CAPIBARA SPAM…');
    await store.save();
    process.exit(0);
  });
}

async function resolveVersion(): Promise<[number, number, number]> {
  try {
    const result = await fetchLatestBaileysVersion();
    return result.version;
  } catch {
    return [2, 3000, 1020304050];
  }
}

/** Crea un socket, enlaza todos sus eventos y devuelve una promesa que se resuelve al cerrarse. */
async function connect(state: AuthState, saveCreds: SaveCreds, version: [number, number, number]): Promise<void> {
  const sock = makeWASocket({
    version,
    auth: state,
    logger: silentLogger,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async () => undefined,
  });

  handler = new Handler(sock);
  currentSock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages as WAMessage[]) {
      // Lectura automática: marca como leído apenas llega el mensaje.
      if (!msg.key.fromMe && store.settings.autoRead) {
        void sock.readMessages([msg.key]).catch(() => {
          /* algunos chats no permiten recibo de lectura */
        });
      }
      if (handler) void handler.handle(msg);
    }
  });

  return new Promise<void>((resolve) => {
    sock.ev.on('connection.update', async (update) => {
      const { connection, qr, lastDisconnect } = update;

      if ((update as { isNewLogin?: boolean }).isNewLogin) {
        logger.info(`${THEME.emoji.check} ¡Dispositivo vinculado correctamente!`);
      }

      // --- Código de vinculación de 8 dígitos ---
      if (qr && !state.creds.registered && config.phoneNumber) {
        if (!pairingRequested) await requestPairingCode(sock, config.phoneNumber);
      }

      // --- Respaldo: código QR (si el código numérico falla) ---
      if (qr && !state.creds.registered) {
        console.log(`\n${THEME.emoji.lock} Respaldo: escanea este código QR si el número no funciona:\n`);
        try {
          console.log(await QRCode.toString(qr, { type: 'terminal', small: true }));
        } catch {
          logger.info(qr);
        }
      }

      if (connection === 'open') {
        logger.info(`${THEME.emoji.check} Sesión iniciada como ${sock.user?.name ?? 'Capibara'}`);
        await groups.syncFromBaileys(sock);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
        logger.warn({ statusCode }, 'Conexión cerrada');

        if (!shouldReconnect(lastDisconnect) && state.creds.registered) {
          logger.error('Sesión cerrada (401). Elimina la carpeta auth_info/ para vincular de nuevo.');
          resolve();
          return;
        }

        // Si aún no hay pairing, seguimos reconectando para emitir un código nuevo.
        await sleep(3000);
        pairingRequested = false;
        await connect(state, saveCreds, version);
        resolve();
      }
    });
  });
}
