import { THEME } from '../config/theme';
import { campaigns } from '../services/CampaignService';
import { detectMediaType, saveMedia } from '../services/MediaService';
import { store } from '../storage/Store';
import type { WAMessage } from '@whiskeysockets/baileys';
import type { CampaignType, Command } from '../types';
import { previewMenu } from '../ui/menus';
import { messageText } from '../utils/helpers';

const E = THEME.emoji;

/** Devuelve el texto exacto después del primer token (ID), preservando saltos de línea. */
function afterFirstToken(ctx: { fullArgs: string }): string {
  return (ctx.fullArgs.match(/^\s*\S+\s?([\s\S]*)$/)?.[1] ?? '').trimEnd();
}

/** Obtiene el mensaje con medio: citado primero, luego el mensaje actual. */
function mediaMessage(ctx: Parameters<Command['run']>[0]): { msg: WAMessage; text: string } | null {
  const candidates = [ctx.quoted, ctx.msg].filter(Boolean);
  for (const m of candidates) {
    const type = detectMediaType(m as never);
    if (type) return { msg: m as WAMessage, text: messageText(m as never) };
  }
  return null;
}

function mediaCommand(type: CampaignType, label: string, emoji: string, aliases: string[] = []): Command {
  return {
    name: type,
    aliases,
    category: 'anuncios',
    description: `Crear anuncio con ${label.toLowerCase()}`,
    usage: `.spam ${type} [texto]  (responde a un archivo o adjúntalo)`,
    run: async (ctx) => {
      const found = mediaMessage(ctx);
      if (!found) {
        await ctx.reply(
          `${E.warn} ${emoji} Responde a un archivo de ${label.toLowerCase()} o adjúntalo al comando.\n\n` +
            `▸ Ejemplo: \`.spam ${type} Tu texto\` con el archivo adjunto\n` +
            `▸ O responde a un archivo con \`.spam ${type} Tu texto\``,
        );
        return;
      }
      await ctx.react('⏳');
      try {
        const media = await saveMedia(found.msg, ctx.sock);
        // Si el medio está en el MISMO mensaje del comando, ctx.fullArgs ya
        // excluye el comando; usar found.text repetiría ".spam imagen" como caption.
        const fromQuoted = found.msg !== ctx.msg;
        const caption = ctx.fullArgs.trim() || (fromQuoted ? found.text.trim() : '') || undefined;
        const campaign = campaigns.create(type, { ...media, caption }, `${label} ${new Date().toLocaleDateString('es-MX')}`);
        await ctx.react(E.check);
        await ctx.reply(
          `${E.check} ${emoji} Anuncio de ${label.toLowerCase()} creado.\n` +
            `🆔 ID: \`${campaign.id}\`\n` +
            `${caption ? `📝 Texto: ${caption}\n` : ''}\n` +
            `▸ Previsualiza: \`.spam previsualizar ${campaign.id}\`\n` +
            `▸ Guarda: \`.spam guardar ${campaign.id} <nombre>\``,
        );
      } catch (err) {
        await ctx.react(E.cross);
        await ctx.reply(`${E.cross} No se pudo descargar el archivo: ${err instanceof Error ? err.message : 'error'}`);
      }
    },
  };
}

export const anunciosCommands: Command[] = [
  {
    name: 'msg',
    aliases: ['mensaje', 'texto'],
    category: 'anuncios',
    description: 'Crear anuncio de texto',
    usage: '.spam msg <texto>',
    minArgs: 1,
    run: async (ctx) => {
      const text = ctx.fullArgs.trim();
      const campaign = campaigns.create('texto', { text }, `Texto ${new Date().toLocaleDateString('es-MX')}`);
      await ctx.react(E.check);
      await ctx.reply(
        `${E.check} ${E.mail} Anuncio de texto creado.\n\n` +
          `🆔 ID: \`${campaign.id}\`\n📝 Contenido:\n┌${'─'.repeat(28)}\n${text.split('\n').map((line) => `│ ${line}`).join('\n')}\n└${'─'.repeat(28)}\n\n` +
          `▸ \`.spam guardar ${campaign.id} <nombre>\`\n▸ \`.spam previsualizar ${campaign.id}\``,
      );
    },
  },
  mediaCommand('imagen', 'Imagen', E.image, ['img', 'foto']),
  mediaCommand('video', 'Video', E.video),
  mediaCommand('audio', 'Audio', E.audio),
  mediaCommand('documento', 'Documento', E.document),
  mediaCommand('sticker', 'Sticker', E.sticker),
  {
    name: 'editar',
    aliases: ['edit'],
    category: 'anuncios',
    description: 'Editar el texto de una campaña',
    usage: '.spam editar <id> <nuevo texto>',
    minArgs: 2,
    run: async (ctx) => {
      const id = ctx.args[0];
      const text = afterFirstToken(ctx);
      if (!text) return ctx.reply(`${E.warn} Escribe el nuevo texto.`);
      const campaign = store.getCampaign(id)
        ? campaigns.edit(id, text, Boolean(store.getCampaign(id)?.content.mediaPath))
        : undefined;
      if (!campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${id}\`.`);
      await ctx.react(E.check);
      await ctx.reply(`${E.check} ${E.edit} Campaña \`${campaign.id}\` actualizada.\n\n📝 Nuevo texto:\n${text}`);
    },
  },
  {
    name: 'previsualizar',
    aliases: ['preview', 'ver'],
    category: 'anuncios',
    description: 'Previsualizar una campaña',
    usage: '.spam previsualizar <id>',
    minArgs: 1,
    run: async (ctx) => {
      const campaign = store.getCampaign(ctx.args[0]) ?? (ctx.args[0] === 'ultima' ? campaigns.latest() : undefined);
      if (!campaign) return ctx.reply(`${E.cross} No encontré la campaña.`);
      const authorized = store.listGroups().filter((g) => g.status === 'autorizado' && g.selected).length;
      await ctx.reply(previewMenu(campaign, authorized));
    },
  },
  {
    name: 'guardar',
    aliases: ['save'],
    category: 'anuncios',
    description: 'Guardar/renombrar una campaña',
    usage: '.spam guardar <id> <nombre>',
    minArgs: 2,
    run: async (ctx) => {
      const id = ctx.args[0];
      const name = afterFirstToken(ctx);
      const campaign = campaigns.save(id, name);
      if (!campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${id}\`.`);
      await ctx.react(E.save);
      await ctx.reply(`${E.check} ${E.save} Campaña guardada como *${campaign.name}*`);
    },
  },
];
