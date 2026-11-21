import fs from 'node:fs';
import path from 'node:path';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import { findCommand } from '../commands';
import { config } from '../config';
import { THEME } from '../config/theme';
import { store } from '../storage/Store';
import type { CommandContext } from '../types';
import { messageText, senderJid } from '../utils/helpers';
import { globalLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

const E = THEME.emoji;

export class Handler {
  constructor(private readonly sock: WASocket) {}

  async handle(msg: WAMessage): Promise<void> {
    if (msg.key.fromMe) return;
    const text = messageText(msg).trim();
    if (!text.startsWith(config.prefix)) return;

    const jid = senderJid(msg);
    if (!jid) return;

    const sender = msg.key.participant ?? msg.key.remoteJid ?? jid;
    const isOwner = this.isOwner(sender, msg);

    // Límite global por usuario (10 comandos por minuto).
    if (!globalLimiter.check(`cmd:${sender}`, 10, 60_000)) {
      await this.react(msg, E.warn);
      return;
    }

    const withoutPrefix = text.slice(config.prefix.length);
    // Conserva el texto posterior al comando EXACTAMENTE como fue escrito
    // (incluye saltos de línea, espacios y párrafos). Solo separa el comando.
    const parsed = withoutPrefix.match(/^\s*(\S+)\s?([\s\S]*)$/);
    const rawCommand = (parsed?.[1] ?? '').toLowerCase();
    const rawArgs = parsed?.[2] ?? '';
    const parts = rawArgs.trim().split(/\s+/).filter(Boolean);
    const command = rawCommand ? findCommand(rawCommand) : findCommand('menu');

    if (!command) {
      await this.reply(msg, `${E.warn} Comando desconocido: *${rawCommand}*\n\n▸ Usa \`${config.prefix} ayuda\` para ver los comandos.`);
      return;
    }

    if (command.ownerOnly && !isOwner) {
      logger.warn(
        { sender, jid, participant: msg.key.participant, owner: config.ownerNumber },
        'Comando de owner rechazado',
      );
      await this.reply(msg, `${E.lock} Este comando es solo para el propietario.`);
      return;
    }

    if (command.minArgs && parts.length < command.minArgs) {
      await this.reply(msg, `${E.warn} Faltan argumentos.\n\n▸ Uso: \`${command.usage}\``);
      return;
    }

    const ctx: CommandContext = {
      sock: this.sock,
      msg,
      jid,
      sender,
      args: parts,
      fullArgs: rawArgs,
      command: command.name,
      isOwner,
      usageHint: command.usage,
      quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        ? ({
            key: {
              remoteJid: jid,
              participant: sender,
              id: msg.message.extendedTextMessage.contextInfo.stanzaId,
            },
            message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
          } as WAMessage)
        : undefined,
      reply: (t) => this.reply(msg, t),
      react: (emoji) => this.react(msg, emoji),
    };

    try {
      await command.run(ctx);
    } catch (err) {
      logger.error({ err, command: command.name }, 'Error ejecutando comando');
      await this.reply(msg, `${E.cross} Ocurrió un error al ejecutar *${command.name}*: ${err instanceof Error ? err.message : 'desconocido'}`);
    }
  }

  /**
   * Acepta al owner aunque WhatsApp envíe un @lid en vez del número, o un JID
   * con sufijo de dispositivo (503...:2@s.whatsapp.net).
   */
  private isOwner(sender: string, msg: WAMessage): boolean {
    if (!config.ownerNumber) return true;
    const jids = [sender, msg.key.remoteJid ?? '', msg.key.participant ?? ''];

    for (const jid of jids) {
      if (!jid) continue;
      const base = jid.split('@')[0].split(':')[0];
      if (base === config.ownerNumber) return true;
      if (!jid.includes('@lid')) continue;
      try {
        const mapping = fs.readFileSync(
          path.join(config.paths.auth, `lid-mapping-${base}_reverse.json`),
          'utf8',
        );
        if (mapping.replace(/[^\d]/g, '') === config.ownerNumber) return true;
      } catch {
        // Sin mapeo inverso: se prueba el siguiente identificador.
      }
    }
    return false;
  }

  private async reply(msg: WAMessage, text: string): Promise<void> {
    try {
      await this.sock.sendMessage(msg.key.remoteJid!, { text }, { quoted: msg });
    } catch (err) {
      logger.warn({ err }, 'No se pudo responder');
    }
  }

  private async react(msg: WAMessage, emoji: string): Promise<void> {
    try {
      await this.sock.sendMessage(msg.key.remoteJid!, {
        react: { text: emoji, key: msg.key },
      });
    } catch {
      /* las reacciones son opcionales */
    }
  }
}

/** Maneja el evento connection.update y reinicia el estado si es necesario. */
export function shouldReconnect(lastDisconnect: unknown): boolean {
  const statusCode = (lastDisconnect as { error?: { output?: { statusCode?: number } } })?.error?.output?.statusCode;
  return statusCode !== 401;
}
