import { groups } from '../services/GroupService';
import { store } from '../storage/Store';
import { THEME } from '../config/theme';
import type { Command } from '../types';
import { groupInfoMenu, groupsMenu } from '../ui/menus';
import { inviteCode } from '../utils/helpers';
import { resolveGroup } from './_shared';

const E = THEME.emoji;

export const destinosCommands: Command[] = [
  {
    name: 'unir',
    category: 'destinos',
    description: 'Unirse a un grupo mediante enlace o código',
    usage: '.spam unir <link|codigo>',
    minArgs: 1,
    run: async (ctx) => {
      await ctx.react('⏳');
      const code = inviteCode(ctx.fullArgs);
      if (!code) {
        await ctx.reply(`${E.warn} Código de invitación inválido.\n\n▸ ${ctx.usageHint}`);
        return;
      }
      const result = await groups.join(ctx.sock, code);
      await ctx.react(result.ok ? E.check : E.cross);
      await ctx.reply(
        result.ok
          ? `${E.check} ${result.message}\n\n${E.lock} Estado: *pendiente* — autoriza con \`.spam grupo autorizar ${result.jid}\``
          : `${E.cross} No se pudo unir: ${result.message}`,
      );
    },
  },
  {
    name: 'grupos',
    aliases: ['grupos-lista', 'gl'],
    category: 'destinos',
    description: 'Listar grupos registrados',
    usage: '.spam grupos',
    run: async (ctx) => {
      await groups.syncFromBaileys(ctx.sock);
      await ctx.reply(groupsMenu(store.listGroups()));
    },
  },
  {
    name: 'grupo',
    category: 'destinos',
    description: 'Administrar grupos (subcomandos)',
    usage: '.spam grupo <add|remove|info|verificar|seleccionar|autorizar|excluir> <jid>',
    minArgs: 1,
    run: async (ctx) => {
      const [action, ...rest] = ctx.args;
      const target = rest.join(' ').trim();

      switch (action.toLowerCase()) {
        case 'add': {
          if (!target) return ctx.reply(`${E.warn} Indica el JID o número.\n▸ ${ctx.usageHint}`);
          const group = groups.add(target);
          await ctx.reply(`${E.check} Grupo registrado:\n\`${group.id}\`\n\nEstado: *${group.status}*`);
          return;
        }
        case 'remove':
        case 'del': {
          if (!target) return ctx.reply(`${E.warn} Indica el grupo a eliminar.`);
          const group = resolveGroup(ctx, target);
          if (!group) return ctx.reply(`${E.cross} No encontré ese grupo.`);
          await ctx.reply(groups.remove(group.id) ? `${E.check} Grupo eliminado: ${group.name}` : `${E.cross} No se pudo eliminar.`);
          return;
        }
        case 'info': {
          if (!target) return ctx.reply(`${E.warn} Indica el grupo.`);
          const group = resolveGroup(ctx, target);
          if (!group) return ctx.reply(`${E.cross} No encontré ese grupo.`);
          return ctx.reply(groupInfoMenu(group));
        }
        case 'verificar': {
          if (!target) return ctx.reply(`${E.warn} Indica el grupo.`);
          const group = resolveGroup(ctx, target);
          if (!group) return ctx.reply(`${E.cross} No encontré ese grupo.`);
          await ctx.react('⏳');
          const result = await groups.verify(ctx.sock, group.id);
          await ctx.react(result.member ? E.check : E.cross);
          await ctx.reply(
            `${result.member ? E.check : E.cross} ${result.info}\n\n${E.capibara} El bot ${result.member ? 'SÍ está' : 'NO está'} en el grupo.`,
          );
          return;
        }
        case 'seleccionar':
        case 'sel': {
          if (!target) return ctx.reply(`${E.warn} Indica el grupo.`);
          const group = resolveGroup(ctx, target);
          if (!group) return ctx.reply(`${E.cross} No encontré ese grupo.`);
          const updated = groups.toggleSelect(group.id);
          await ctx.reply(`${E.check} ${updated?.name}: ${updated?.selected ? '🟢 seleccionado' : '⚪ deseleccionado'}`);
          return;
        }
        case 'autorizar':
        case 'auth': {
          if (['todos', 'todo', 'all', '*'].includes(target.toLowerCase())) {
            const count = groups.authorizeAll();
            await ctx.react(E.check);
            return ctx.reply(`${E.lock} ${E.check} *${count} grupos autorizados*.\n\nYa puedes enviar campañas con \`.spam enviar todos\`.`);
          }
          if (!target) return ctx.reply(`${E.warn} Indica el grupo a autorizar.`);
          const group = resolveGroup(ctx, target);
          if (!group) return ctx.reply(`${E.cross} No encontré ese grupo.`);
          const updated = groups.setStatus(group.id, 'autorizado');
          await ctx.react(E.check);
          await ctx.reply(
            `${E.lock} ${E.check} Grupo *autorizado*: ${updated?.name}\n\n${E.water} Ahora puede recibir campañas. Usa \`.spam grupo excluir\` para revocar.`,
          );
          return;
        }
        case 'excluir':
        case 'revoke': {
          if (!target) return ctx.reply(`${E.warn} Indica el grupo a excluir.`);
          const group = resolveGroup(ctx, target);
          if (!group) return ctx.reply(`${E.cross} No encontré ese grupo.`);
          groups.setStatus(group.id, 'excluido');
          await ctx.react(E.cross);
          await ctx.reply(`${E.lock} ${E.check} Grupo *excluido*: ${group.name}\n\nYa no recibirá campañas.`);
          return;
        }
        default:
          await ctx.reply(
            `${E.warn} Subcomando desconocido: *${action}*\n\n` +
              'Disponibles:\n' +
              '▸ add · remove · info · verificar\n' +
              '▸ seleccionar · autorizar · excluir',
          );
      }
    },
  },
  {
    name: 'autorizar',
    aliases: ['autorizartodos', 'authall'],
    category: 'destinos',
    description: 'Autorizar todos los grupos de una vez',
    usage: '.spam autorizar todos',
    run: async (ctx) => {
      const count = groups.authorizeAll();
      await ctx.react(E.check);
      await ctx.reply(
        `${E.lock} ${E.check} *${count} grupos autorizados*.\n\n` +
          `Ahora envía con: \`.spam enviar todos\`\n` +
          `O programa cada 3 min: \`.spam repetir todos 3m\``,
      );
    },
  },
];

