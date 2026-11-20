import { THEME, toBold, toItalic } from '../config/theme';
import { broadcast } from '../services/BroadcastService';
import { campaigns } from '../services/CampaignService';
import { groups } from '../services/GroupService';
import { sendProof } from '../services/ProofService';
import { store } from '../storage/Store';
import type { Command } from '../types';
import { campaignsMenu, helpMenu, mainMenu, sendReport } from '../ui/menus';
import { formatDate } from '../utils/helpers';

const E = THEME.emoji;

/** Estadísticas de entrega de una campaña según el historial persistido. */
function deliveryStats(campaignId: string): { groups: number; today: number; lastAt: number } {
  const prefix = `${campaignId}:`;
  const today = new Date().toDateString();
  let groups = 0;
  let todayCount = 0;
  let lastAt = 0;
  for (const [key, at] of Object.entries(store.snapshot.deliveries)) {
    if (!key.startsWith(prefix)) continue;
    groups++;
    if (new Date(at).toDateString() === today) todayCount++;
    if (at > lastAt) lastAt = at;
  }
  return { groups, today: todayCount, lastAt };
}

/** Total acumulado: usa el contador nuevo o lo reconstruye de la auditoría. */
function totalSent(campaign: { id: string; totalSent?: number }): number {
  return campaign.totalSent ?? store.countAuditSends(campaign.id);
}

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
    name: 'enviados',
    aliases: ['envios', 'contar', 'stats', 'mensajes', 'cuantos'],
    category: 'general',
    description: 'Ver cuántos mensajes ha enviado el bot (por campaña o total)',
    usage: '.spam enviados [id]',
    run: async (ctx) => {
      const all = store.listCampaigns();
      if (!all.length) return ctx.reply(`${E.warn} No hay campañas guardadas todavía.`);

      const key = ctx.args[0]?.toLowerCase();
      const campaign = key ? store.getCampaign(key) : undefined;
      if (key && !campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${ctx.args[0]}\`.`);

      if (campaign) {
        const d = deliveryStats(campaign.id);
        const total = totalSent(campaign);
        const last = campaign.sentCount ?? total;
        const lastDate = campaign.sentAt ?? d.lastAt;
        await ctx.reply(
          [
            `╭━━━━━━━━━━━━━━━━━━━━━━╮`,
            `┃  ${E.chart} ${toBold('MENSAJES ENVIADOS')}  ┃`,
            `╰━━━━━━━━━━━━━━━━━━━━━━╯`,
            '',
            `${E.mail} Campaña: ${campaign.name}`,
            `🆔 ID: \`${campaign.id}\``,
            `📨 Total enviado: *${total}* mensajes`,
            `🔁 Último envío: ${last} mensajes`,
            `👥 Grupos alcanzados: ${d.groups}`,
            `📅 Hoy: ${d.today} mensajes`,
            `🕒 Última vez: ${lastDate ? formatDate(lastDate) : 'nunca'}`,
          ].join('\n'),
        );
        return;
      }

      const rows = all.map((c) => `▸ \`${c.id}\` ${c.name}: *${totalSent(c)}*`);
      const total = all.reduce((sum, c) => sum + totalSent(c), 0);
      const reached = new Set(
        Object.keys(store.snapshot.deliveries).map((k) => k.slice(k.indexOf(':') + 1)),
      ).size;
      await ctx.reply(
        [
          `╭━━━━━━━━━━━━━━━━━━━━━━╮`,
          `┃  ${E.chart} ${toBold('TOTAL DE ENVÍOS')}  ┃`,
          `╰━━━━━━━━━━━━━━━━━━━━━━╯`,
          '',
          `📨 Mensajes enviados: *${total}*`,
          `🗂️ Campañas: ${all.length}`,
          `👥 Grupos alcanzados: ${reached}`,
          '',
          `${toItalic('por campaña')}`,
          ...rows,
          '',
          `▸ \`.spam enviados <id>\` para el detalle`,
        ].join('\n'),
      );
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
      if (store.isPaused()) {
        return ctx.reply(`${E.warn} Los envíos están detenidos. Usa \`.spam reanudar\` primero.`);
      }
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
      await sendProof(ctx.sock, campaign, result);
    },
  },
  {
    name: 'detener',
    aliases: ['parar', 'pausa', 'stop', 'pause', 'apagar'],
    category: 'general',
    description: 'Detener TODOS los envíos a grupos (manuales y programados)',
    usage: '.spam detener',
    ownerOnly: true,
    run: async (ctx) => {
      if (store.isPaused()) {
        return ctx.reply(`${E.warn} Los envíos ya están detenidos. Usa \`.spam reanudar\` para activarlos.`);
      }
      store.setPaused(true);
      store.audit('envios.detener', 'Envíos detenidos globalmente', ctx.sender);
      await ctx.react(E.check);
      await ctx.reply(
        `${E.check} 🛑 *Todos los envíos detenidos.*\n\n` +
          `No se enviará ningún mensaje a grupos (ni manual ni programado).\n` +
          `Para volver a enviar: \`.spam reanudar\`.`,
      );
    },
  },
  {
    name: 'reanudar',
    aliases: ['resume', 'continuar', 'activar', 'play', 'encender'],
    category: 'general',
    description: 'Reanudar los envíos a grupos',
    usage: '.spam reanudar',
    ownerOnly: true,
    run: async (ctx) => {
      if (!store.isPaused()) {
        return ctx.reply(`${E.warn} Los envíos ya están activos. Para detenerlos: \`.spam detener\`.`);
      }
      store.setPaused(false);
      store.audit('envios.reanudar', 'Envíos reanudados', ctx.sender);
      await ctx.react(E.check);
      await ctx.reply(`${E.check} ✅ *Envíos reanudados.* Las programaciones se retoman en el próximo tick.`);
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
          store.isPaused()
            ? `🛑 Envíos: *DETENIDOS* (\`.spam reanudar\`)`
            : `✅ Envíos: activos (\`.spam detener\`)`,
          `${E.pin} Grupos: ${all.length} · Autorizados: ${authorized.length}`,
          `${E.mail} Campañas: ${store.listCampaigns().length}`,
          `⏱️ Retardo entre envíos: ${s.sendDelayMs} ms`,
          `📊 Límite diario por grupo: ${s.maxSendsPerGroupDay || '∞'}`,
          `🛡️ Anti-duplicados: ${s.groupCooldownMs ? `${Math.round(s.groupCooldownMs / 1000)} s por campaña/grupo` : 'desactivado'}`,
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
    description: 'Ajustar retardo, límite diario y anti-duplicados',
    usage: '.spam ajustes <retardo_ms> <max_por_dia> [cooldown_ms]',
    minArgs: 2,
    run: async (ctx) => {
      const delay = Number(ctx.args[0]);
      const max = Number(ctx.args[1]);
      const cooldown = ctx.args[2] === undefined ? store.settings.groupCooldownMs : Number(ctx.args[2]);
      if (!Number.isFinite(delay) || !Number.isFinite(max) || !Number.isFinite(cooldown) ||
          delay < 1500 || max < 0 || cooldown < 0) {
        return ctx.reply(`${E.warn} Uso: \`.spam ajustes 1500 0 120000\`\n▸ cooldown 0 = desactivado`);
      }
      store.updateSettings({
        sendDelayMs: delay,
        maxSendsPerGroupDay: max,
        maxGroupsPerCampaign: 0,
        groupCooldownMs: cooldown,
      });
      await ctx.react(E.check);
      await ctx.reply(
        `${E.check} ${E.gear} Ajustes actualizados:\n` +
          `⏱️ Retardo: ${delay} ms\n📊 Máximo por grupo/día: ${max || '∞'}\n` +
          `🛡️ Anti-duplicados: ${cooldown ? `${Math.round(cooldown / 1000)} s` : 'desactivado'}\n` +
          `👥 Grupos por campaña: todos`,
      );
    },
  },
  {
    name: 'reintentar',
    aliases: ['reiniciar-envios', 'limpiar-cooldown', 'resetenvios', 'reenviar'],
    category: 'general',
    description: 'Permite volver a enviar la misma campaña a un grupo antes del cooldown',
    usage: '.spam reintentar [id_campana]',
    run: async (ctx) => {
      const key = ctx.args[0]?.toLowerCase();
      const campaign = key
        ? store.getCampaign(key)
        : undefined;
      if (key && !campaign) return ctx.reply(`${E.cross} No encontré la campaña \`${ctx.args[0]}\`.`);
      const cleared = store.clearDeliveries(campaign?.id);
      store.audit('cooldown.reset', `${cleared} marcas de envío borradas${campaign ? ` (${campaign.id})` : ''}`, ctx.sender);
      await ctx.react(E.check);
      await ctx.reply(
        `${E.check} 🛡️ Se borraron *${cleared}* marcas de envío.\n\n` +
          `▸ Ahora puedes reenviar ${campaign ? `\`${campaign.id}\`` : 'cualquier campaña'} con \`.spam enviar todos\`.`,
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
