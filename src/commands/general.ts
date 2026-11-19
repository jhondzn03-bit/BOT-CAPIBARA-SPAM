import { THEME, toBold, toItalic } from '../config/theme';
import { broadcast } from '../services/BroadcastService';
import { campaigns } from '../services/CampaignService';
import { groups } from '../services/GroupService';
import { store } from '../storage/Store';
import type { Command } from '../types';
import { campaignsMenu, helpMenu, mainMenu, sendReport } from '../ui/menus';
import { formatDate } from '../utils/helpers';

const E = THEME.emoji;

export const generalCommands: Command[] = [
  {
    name: 'menu',
    aliases: ['start', 'help', 'ayuda', '?'],
    category: 'general',
    description: 'Mostrar el menú principal',
    usage: '.spam',
    run: async (ctx) => {
      const all = store.listGroups();
      await ctx.reply(
        helpMenu(),
      );
      await ctx.reply(
        mainMenu(all.length, all.filter((g) => g.status === 'autorizado').length, store.listCampaigns().length),
      );
    },
  },
  {
    name: 'campanas',
    aliases: ['campañas', 'campaigns'],
    category: 'general',
    description: 'Listar campañas guardadas',
    usage: '.spam campanas',
    run: async (ctx) => {
      await ctx.reply(campaignsMenu(store.listCampaigns()));
    },
  },
  {
    name: 'enviar',
    aliases: ['send'],
    category: 'general',
    description: 'Enviar campaña a grupos autorizados',
    usage: '.spam enviar <id|todos>',
    minArgs: 1,
    run: async (ctx) => {
      const key = ctx.args[0].toLowerCase();
      const campaign = ['todos', 'todo', 'all', 'ultima', 'última'].includes(key)
        ? campaigns.latest()
        : store.getCampaign(ctx.args[0]);
      if (!campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${ctx.args[0]}\`.`);

      const authorized = groups.eligible();
      if (!authorized.length) {
        return ctx.reply(
          `${E.warn} No hay grupos autorizados.\n\n` +
            `Autoriza uno con: \`.spam grupo autorizar <jid>\`\n` +
            `${E.lock} Este sistema solo envía a grupos con consentimiento explícito.`,
        );
      }

      await ctx.react('⏳');
      await ctx.reply(`${E.sparkle} Enviando *${campaign.name}* a ${authorized.length} grupos autorizados…`);
      const result = await broadcast(ctx.sock, campaign);
      await ctx.react(result.sent > 0 ? E.check : E.warn);
      await ctx.reply(sendReport(result.sent, result.failed, result.skipped.length));
    },
  },
  {
    name: 'estado',
    aliases: ['status', 'info'],
    category: 'general',
    description: 'Estado del sistema y última auditoría',
    usage: '.spam estado',
    run: async (ctx) => {
      const all = store.listGroups();
      const authorized = all.filter((g) => g.status === 'autorizado');
      const s = store.settings;
      const audit = store.listAudit(8)
        .map((a) => `▸ ${formatDate(a.timestamp)} · ${a.action} — ${a.detail}`)
        .join('\n');

      await ctx.reply(
        [
          `╭━━━━━━━━━━━━━━━━━━━━━━╮`,
          `┃  ${E.gear} ${toBold('ESTADO')}  ┃`,
          `╰━━━━━━━━━━━━━━━━━━━━━━╯`,
          '',
          `${E.capibara} ${THEME.name} v${THEME.version}`,
          `${E.pin} Grupos: ${all.length} · Autorizados: ${authorized.length}`,
          `${E.mail} Campañas: ${store.listCampaigns().length}`,
          `⏱️ Retardo entre envíos: ${s.sendDelayMs} ms`,
          `📊 Límite diario por grupo: ${s.maxSendsPerGroupDay || '∞'}`,
          `🔐 Consentimiento requerido: ${s.requireAuthorization ? 'Sí' : 'No'}`,
          `👁️ Lectura automática: ${s.autoRead ? 'Activada' : 'Desactivada'}`,
          '',
          `${E.chart} ${toItalic('ultimos eventos')}`,
          audit || '▸ Sin eventos registrados',
        ].join('\n'),
      );
    },
  },
  {
    name: 'autoread',
    aliases: ['leer', 'autoleer', 'leido'],
    category: 'general',
    description: 'Activar/desactivar lectura automática de mensajes',
    usage: '.spam autoread <on|off>',
    minArgs: 1,
    run: async (ctx) => {
      const mode = ctx.args[0].toLowerCase();
      if (!['on', 'off', 'si', 'no'].includes(mode)) {
        return ctx.reply(
          `${E.eye} Lectura automática: *${store.settings.autoRead ? 'activada' : 'desactivada'}*\n\n` +
            `▸ \`.spam autoread on\` para activar\n▸ \`.spam autoread off\` para desactivar`,
        );
      }
      const enabled = ['on', 'si'].includes(mode);
      store.updateSettings({ autoRead: enabled });
      store.audit('autoread', enabled ? 'activada' : 'desactivada', 'sistema');
      await ctx.react(E.check);
      await ctx.reply(`${E.check} ${E.eye} Lectura automática *${enabled ? 'activada' : 'desactivada'}*.`);
    },
  },
  {
    name: 'ajustes',
    aliases: ['config'],
    category: 'general',
    description: 'Ajustar retardo y límite diario de envíos',
    usage: '.spam ajustes <retardo_ms> <max_por_dia>',
    minArgs: 2,
    run: async (ctx) => {
      const delay = Number(ctx.args[0]);
      const max = Number(ctx.args[1]);
      if (!Number.isFinite(delay) || !Number.isFinite(max) || delay < 1500 || max < 0) {
        return ctx.reply(`${E.warn} Uso: \`.spam ajustes 1500 0\` (0 = sin límite diario)`);
      }
      store.updateSettings({ sendDelayMs: delay, maxSendsPerGroupDay: max, maxGroupsPerCampaign: 0 });
      await ctx.react(E.check);
      await ctx.reply(
        `${E.check} ${E.gear} Ajustes actualizados:\n` +
          `⏱️ Retardo: ${delay} ms\n📊 Máximo por grupo/día: ${max || '∞'}\n👥 Grupos por campaña: todos`,
      );
    },
  },
  {
    name: 'auditoria',
    aliases: ['logs', 'audit'],
    category: 'general',
    description: 'Ver registro de auditoría',
    usage: '.spam auditoria',
    run: async (ctx) => {
      const entries = store.listAudit(20);
      if (!entries.length) return ctx.reply(`${E.chart} No hay eventos registrados.`);
      await ctx.reply(
        `${E.chart} ${toBold('REGISTRO DE AUDITORÍA')}\n\n` +
          entries.map((a) => `▸ ${formatDate(a.timestamp)}\n   ${a.action}: ${a.detail}`).join('\n'),
      );
    },
  },
];
