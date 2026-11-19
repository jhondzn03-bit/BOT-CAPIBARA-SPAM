import { THEME, toBold } from '../config/theme';
import { campaigns } from '../services/CampaignService';
import { store } from '../storage/Store';
import type { Command, ScheduledCampaign } from '../types';
import { formatDate } from '../utils/helpers';
import { shortId } from '../utils/helpers';

const E = THEME.emoji;

/** Parsea la fecha: "YYYY-MM-DD HH:mm", "DD/MM/YYYY HH:mm" o "+30m / +2h / +1d". */
function parseSchedule(input: string): number | null {
  const value = input.trim();

  const relative = value.match(/^\+(\d+)\s*(m|h|d)$/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const factor = unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return Date.now() + amount * factor;
  }

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (iso) {
    const [, y, mo, d, h, mi] = iso.map(Number) as unknown as number[];
    const date = new Date(y, mo - 1, d, h, mi);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  const latam = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (latam) {
    const [, d, mo, y, h, mi] = latam.map(Number) as unknown as number[];
    const date = new Date(y, mo - 1, d, h, mi);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  return null;
}

/** Parsea "3m", "3 min", "3 minutos" o solo "3". */
function parseMinutes(input: string): number | null {
  const match = input.trim().match(/^(\d+)\s*(?:m|min|minutos?)?$/i);
  return match ? Number(match[1]) : null;
}

/** Resuelve el argumento de campaña: ID, "todos" o "ultima". */
function resolveCampaign(key: string) {
  return ['todos', 'todo', 'all', 'ultima', 'última'].includes(key.toLowerCase())
    ? campaigns.latest()
    : store.getCampaign(key);
}

function scheduledMenu(items: ScheduledCampaign[]): string {
  if (!items.length) return `${E.warn} No hay campañas programadas.`;
  return [
    `╭━━━━━━━━━━━━━━━━━━━━━━╮`,
    `┃  ⏰ ${toBold('PROGRAMADAS')}  ┃`,
    `╰━━━━━━━━━━━━━━━━━━━━━━╯`,
    '',
    ...items.map((s) => {
      const icon = s.status === 'pendiente' ? '🕒' : s.status === 'enviada' ? E.check : E.cross;
      const campaign = store.getCampaign(s.campaignId);
      const repeat = s.repeatMinutes ? ` · 🔁 cada ${s.repeatMinutes} min` : '';
      return `${icon} [${s.id}] ${campaign?.name ?? s.campaignId}\n     └ ${formatDate(s.executeAt)} · ${s.status}${repeat}`;
    }),
  ].join('\n');
}

export const programacionCommands: Command[] = [
  {
    name: 'programar',
    aliases: ['schedule'],
    category: 'general',
    description: 'Programar el envío de una campaña',
    usage: '.spam programar <id> <+30m | +2h | AAAA-MM-DD HH:mm>',
    minArgs: 2,
    run: async (ctx) => {
      const campaign = resolveCampaign(ctx.args[0]);
      if (!campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${ctx.args[0]}\`.`);

      const raw = ctx.fullArgs.match(/^\s*\S+\s+([\s\S]+)$/)?.[1]?.trim() ?? '';
      const every = raw.match(/^cada\s+(\d+)\s*(?:m|min|minutos?)?$/i);
      const repeatMinutes = every ? Number(every[1]) : undefined;
      const executeAt = every ? Date.now() : parseSchedule(raw);
      if (!executeAt) {
        return ctx.reply(
          `${E.warn} Formato de fecha inválido.\n\n` +
            '▸ Repetir: `cada 3m`, `cada 5 min`\n' +
            '▸ Relativo: `+30m`, `+2h`, `+1d`\n' +
            '▸ Absoluto: `2026-12-25 18:30`\n' +
            '▸ Latam: `25/12/2026 18:30`',
        );
      }
      if (!every && executeAt <= Date.now()) return ctx.reply(`${E.warn} La fecha debe ser futura.`);

      const item: ScheduledCampaign = {
        id: shortId(repeatMinutes ? 'r_' : 'p_'),
        campaignId: campaign.id,
        executeAt,
        status: 'pendiente',
        createdAt: Date.now(),
        ...(repeatMinutes ? { repeatMinutes } : {}),
      };
      store.upsertScheduled(item);
      store.audit('programar', `${campaign.id} -> ${formatDate(executeAt)}`, 'sistema');
      await ctx.react('⏰');
      await ctx.reply(
        `${E.check} ⏰ Campaña *${campaign.name}* programada.\n\n` +
          `🆔 Programación: \`${item.id}\`\n📅 Fecha: ${formatDate(executeAt)}\n\n` +
          `▸ \`.spam programados\` · \`.spam cancelar ${item.id}\``,
      );
    },
  },
  {
    name: 'repetir',
    aliases: ['cada', 'loop', 'automatico', 'ciclo'],
    category: 'general',
    description: 'Enviar una campaña cada N minutos (automático)',
    usage: '.spam repetir <id|todos> <3m>',
    minArgs: 2,
    run: async (ctx) => {
      const campaign = resolveCampaign(ctx.args[0]);
      if (!campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${ctx.args[0]}\`.`);

      const minutes = parseMinutes(ctx.args[1]);
      if (!minutes || minutes < 1) {
        return ctx.reply(`${E.warn} Indica los minutos, por ejemplo: \`.spam repetir ${campaign.id} 3m\``);
      }

      const item: ScheduledCampaign = {
        id: shortId('r_'),
        campaignId: campaign.id,
        executeAt: Date.now(),
        status: 'pendiente',
        createdAt: Date.now(),
        repeatMinutes: minutes,
      };
      store.upsertScheduled(item);
      store.audit('repetir', `${campaign.id} cada ${minutes} min`, 'sistema');
      await ctx.react('🔁');
      await ctx.reply(
        `${E.check} 🔁 *${campaign.name}* se enviará cada *${minutes} minutos*.\n\n` +
          `🆔 ID: \`${item.id}\`\n` +
          `📅 Primer envío: ahora\n\n` +
          `▸ \`.spam programados\` · \`.spam cancelar ${item.id}\``,
      );
    },
  },
  {
    name: 'programados',
    aliases: ['scheduled'],
    category: 'general',
    description: 'Listar campañas programadas',
    usage: '.spam programados',
    run: async (ctx) => {
      await ctx.reply(scheduledMenu(store.listScheduled()));
    },
  },
  {
    name: 'cancelar',
    aliases: ['uncancel', 'desprogramar'],
    category: 'general',
    description: 'Cancelar una campaña programada',
    usage: '.spam cancelar <id_programacion>',
    minArgs: 1,
    run: async (ctx) => {
      const id = ctx.args[0];
      const item = store.listScheduled().find((s) => s.id.toLowerCase() === id.toLowerCase() || s.campaignId.toLowerCase() === id.toLowerCase());
      if (!item) return ctx.reply(`${E.cross} No encontré esa programación.`);
      item.status = 'cancelada';
      store.upsertScheduled(item);
      store.audit('cancelar', `Programación ${item.id} cancelada`, 'sistema');
      await ctx.reply(`${E.check} Programación \`${item.id}\` cancelada.`);
    },
  },
  {
    name: 'boton',
    aliases: ['botoncta', 'cta'],
    category: 'anuncios',
    description: 'Agregar botón de enlace (CTA) a una campaña de texto',
    usage: '.spam boton <id> <texto del boton> <https://url>',
    minArgs: 3,
    run: async (ctx) => {
      const campaign = store.getCampaign(ctx.args[0]);
      if (!campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${ctx.args[0]}\`.`);
      if (campaign.type !== 'texto') return ctx.reply(`${E.warn} Los botones CTA solo aplican a campañas de texto.`);

      const rest = ctx.fullArgs.match(/^\s*\S+\s+([\s\S]+)$/)?.[1]?.trim() ?? '';
      const urlMatch = rest.match(/(\S+)\s*$/);
      const url = urlMatch?.[1] ?? '';
      const label = rest.slice(0, rest.length - url.length).trim();
      if (!/^https?:\/\//.test(url) || !label) {
        return ctx.reply(`${E.warn} Uso: \`.spam boton ${campaign.id} Ver oferta https://ejemplo.com\``);
      }

      campaign.content.button = { text: label, url };
      campaign.updatedAt = Date.now();
      store.upsertCampaign(campaign);
      store.audit('campana.boton', `${campaign.id} -> ${label}`, 'sistema');
      await ctx.react(E.check);
      await ctx.reply(`${E.check} 🔗 Botón agregado a \`${campaign.id}\`: *${label}* → ${url}`);
    },
  },
  {
    name: 'vista',
    aliases: ['previewlink', 'linkpreview'],
    category: 'anuncios',
    description: 'Activar/desactivar vista previa de enlaces',
    usage: '.spam vista <id> <on|off>',
    minArgs: 2,
    run: async (ctx) => {
      const campaign = store.getCampaign(ctx.args[0]);
      if (!campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${ctx.args[0]}\`.`);
      const mode = ctx.args[1].toLowerCase();
      if (!['on', 'off', 'si', 'no'].includes(mode)) return ctx.reply(`${E.warn} Usa \`on\` u \`off\`.`);
      campaign.content.linkPreview = ['on', 'si'].includes(mode);
      campaign.updatedAt = Date.now();
      store.upsertCampaign(campaign);
      await ctx.reply(`${E.check} Vista previa de enlaces: *${campaign.content.linkPreview ? 'activada' : 'desactivada'}*`);
    },
  },
];
