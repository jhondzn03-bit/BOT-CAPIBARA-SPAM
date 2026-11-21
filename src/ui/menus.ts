import { config } from '../config';
import { THEME, toBold, toItalic } from '../config/theme';
import type { Campaign, GroupRecord } from '../types';
import { formatDate, timeAgo, truncate } from '../utils/helpers';

const P = config.prefix;
const E = THEME.emoji;

const LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const LINE_SHORT = '━━━━━━━━━━━━━━━━━━━━━━';

/** Menú principal. */
export function mainMenu(totalGroups: number, authorized: number, totalCampaigns: number): string {
  return [
    `╭${LINE}╮`,
    `┃      ${THEME.name}      ┃`,
    `┃   ${toItalic('gestion profesional de campanas')}   ┃`,
    `╠${LINE}╣`,
    `┃  ${E.sparkle} ${toBold('ESTADO GENERAL')}`,
    `┃  ${E.chart} Grupos: ${totalGroups}  ${E.check} Autorizados: ${authorized}`,
    `┃  ${E.mail} Campañas: ${totalCampaigns}`,
    `╠${LINE}╣`,
    `┃  ${E.pin} ${toBold('DESTINOS')}`,
    `┃   ▸ ${P} unir  ${P} grupos`,
    `┃   ▸ ${P} grupo add | remove | info`,
    `┃   ▸ ${P} grupo verificar | seleccionar`,
    `┃   ▸ ${P} grupo autorizar | excluir`,
    `╠${LINE}╣`,
    `┃  ${E.mail} ${toBold('ANUNCIOS')}`,
    `┃   ▸ ${P} msg | imagen | video | audio`,
    `┃   ▸ ${P} documento | sticker`,
    `┃   ▸ ${P} editar | previsualizar | guardar`,
    `┃   ▸ ${P} boton | vista | programar`,
    `╠${LINE}╣`,
    `┃  ${E.gear} ${toBold('ACCIONES')}`,
    `┃   ▸ ${P} campanas   ▸ ${P} enviar <id>`,
    `┃   ▸ ${P} enviados   ▸ ${P} estado`,
    `┃   ▸ ${P} ayuda      ▸ ${P} comandos`,
    `╰${LINE}╯`,
    '',
    `${E.water} ${toItalic('usa con responsabilidad y consentimiento')}`,
  ].join('\n');
}

/** Menú de ayuda detallado. */
export function helpMenu(): string {
  return [
    `╭${LINE}╮`,
    `┃   ${E.capibara} ${toBold('CENTRO DE AYUDA')}   ┃`,
    `╰${LINE}╯`,
    '',
    `${E.pin} ${toBold('DESTINOS')}`,
    `▸ ${P} unir <link|codigo>       Unirse a un grupo`,
    `▸ ${P} grupos                  Listar grupos registrados`,
    `▸ ${P} grupo add <jid>          Registrar un grupo`,
    `▸ ${P} grupo remove <jid>       Eliminar un grupo`,
    `▸ ${P} grupo info <jid>         Información del grupo`,
    `▸ ${P} grupo verificar <jid>    Verificar membresía`,
    `▸ ${P} grupo seleccionar <jid>  Seleccionar/deseleccionar`,
    `▸ ${P} grupo autorizar <jid>    Autorizar envíos (consentimiento)`,
    `▸ ${P} autorizar todos          Autorizar TODOS los grupos`,
    `▸ ${P} grupo excluir <jid>      Excluir de campañas`,
    '',
    `${E.mail} ${toBold('ANUNCIOS')}`,
    `▸ ${P} msg <texto>             Crear anuncio de texto`,
    `▸ ${P} imagen|img|foto [texto] Imagen + texto (adjunta o responde)`,
    `▸ ${P} video [texto]           Anuncio con video`,
    `▸ ${P} audio                   Anuncio con audio (responder audio)`,
    `▸ ${P} documento [texto]       Anuncio con documento`,
    `▸ ${P} sticker                 Anuncio con sticker`,
    `▸ ${P} editar <id> <texto>     Editar texto de una campaña`,
    `▸ ${P} previsualizar <id>      Previsualizar anuncio`,
    `▸ ${P} guardar <id> <nombre>   Guardar campaña`,
    `▸ ${P} boton <id> <texto> <url> Botón CTA`,
    `▸ ${P} vista <id> on|off      Vista previa de link`,
    '',
    `${E.gear} ${toBold('GENERAL')}`,
    `▸ ${P} programar <id> <+2h>   Programar envío`,
    `▸ ${P} repetir <id|todos> 3m  Enviar cada 3 minutos`,
    `▸ ${P} ajustes 1500 0 120000 Retardo / límite / anti-duplicados`,
    `▸ ${P} reintentar [id]       Permitir reenviar (limpia cooldown)`,
    `▸ ${P} autoread on|off       Leer mensajes solo`,
    `▸ ${P} programados            Ver programaciones`,
    `▸ ${P} cancelar <id>          Cancelar programación`,
    `▸ ${P} campanas               Listar campañas`,
    `▸ ${P} enviar <id>             Enviar a grupos autorizados`,
    `▸ ${P} detener                Detener TODOS los envíos`,
    `▸ ${P} reanudar               Volver a enviar`,
    `▸ ${P} enviados [id]          Contar mensajes enviados`,
    `▸ ${P} estado                 Estado del sistema`,
    `▸ ${P} ayuda                  Este menú`,
    '',
    `${E.lock} ${toItalic('los envíos requieren grupos autorizados')}`,
  ].join('\n');
}

/** Lista de grupos. */
export function groupsMenu(groups: GroupRecord[]): string {
  if (!groups.length) {
    return `${E.warn} ${toBold('NO HAY GRUPOS REGISTRADOS')}\n\n▸ Usa ${P} unir <link> o ${P} grupo add <jid>`;
  }
  const lines = [
    `╭${LINE_SHORT}╮`,
    `┃  ${E.pin} ${toBold('DIRECTORIO DE GRUPOS')}  ┃`,
    `╰${LINE_SHORT}╯`,
    '',
  ];
  groups.forEach((g, i) => {
    const icon = g.status === 'autorizado' ? E.check : g.status === 'excluido' ? E.cross : E.warn;
    const sel = g.selected ? '🟢' : '⚪';
    lines.push(
      `${String(i + 1).padStart(2, '0')}. ${icon} ${sel} ${truncate(g.name, 30)}`,
      `     └ ${g.id.split('@')[0]} · ${g.status} · ${timeAgo(g.addedAt)}`,
    );
  });
  lines.push('', `🟢 seleccionado  ⚪ no seleccionado`);
  lines.push(`${E.water} Total: ${groups.length} grupos`);
  return lines.join('\n');
}

/** Ficha de un grupo. */
export function groupInfoMenu(g: GroupRecord): string {
  return [
    `╭${LINE_SHORT}╮`,
    `┃  ${E.pin} ${toBold('FICHA DEL GRUPO')}  ┃`,
    `╰${LINE_SHORT}╯`,
    '',
    `${E.capibara} Nombre: ${g.name}`,
    `🆔 JID: ${g.id}`,
    `👥 Participantes: ${g.participants ?? '—'}`,
    `🔐 Estado: ${g.status}`,
    `🎯 Seleccionado: ${g.selected ? 'Sí' : 'No'}`,
    `📅 Registrado: ${formatDate(g.addedAt)}`,
    `📨 Enviado: ${g.lastSentAt ? formatDate(g.lastSentAt) : 'Nunca'}`,
    `📊 Envíos hoy: ${g.sendsToday}`,
    ...(g.notes ? [`📝 Notas: ${g.notes}`] : []),
  ].join('\n');
}

/** Lista de campañas. */
export function campaignsMenu(campaigns: Campaign[]): string {
  if (!campaigns.length) {
    return `${E.warn} ${toBold('NO HAY CAMPAÑAS GUARDADAS')}\n\n▸ Crea una con ${P} msg <texto>`;
  }
  const lines = [
    `╭${LINE_SHORT}╮`,
    `┃  ${E.mail} ${toBold('MIS CAMPAÑAS')}  ┃`,
    `╰${LINE_SHORT}╯`,
    '',
  ];
  campaigns.forEach((c) => {
    const icon = {
      texto: '✉️', imagen: E.image, video: E.video,
      audio: E.audio, documento: E.document, sticker: E.sticker,
    }[c.type];
    lines.push(
      `${icon} [${c.id}] ${truncate(c.name, 26)}`,
      `     └ ${c.status} · ${c.type} · ${formatDate(c.updatedAt)}`,
    );
  });
  return lines.join('\n');
}

/** Previsualización de campaña. */
export function previewMenu(campaign: Campaign, recipients: number): string {
  const content = campaign.content.caption ?? campaign.content.text ?? '—';
  return [
    `╭${LINE_SHORT}╮`,
    `┃  ${E.eye} ${toBold('PREVISUALIZACIÓN')}  ┃`,
    `╰${LINE_SHORT}╯`,
    '',
    `🆔 ID: ${campaign.id}`,
    `📛 Nombre: ${campaign.name}`,
    `📦 Tipo: ${campaign.type}`,
    `🎯 Destinatarios autorizados: ${recipients}`,
    ...(campaign.content.mediaPath ? [`📎 Archivo: ${campaign.content.fileName ?? 'adjunto'}`] : []),
    '',
    `${toItalic('contenido:')}`,
    `┌${'─'.repeat(30)}`,
    content.split('\n').map((line) => `│ ${line}`).join('\n'),
    `└${'─'.repeat(30)}`,
    '',
    `▸ Enviar con: ${P} enviar ${campaign.id}`,
  ].join('\n');
}

/** Confirmación de envío. */
export function sendReport(sent: number, failed: number, skipped: number): string {
  return [
    `╭${LINE_SHORT}╮`,
    `┃  ${E.chart} ${toBold('REPORTE DE ENVÍO')} ┃`,
    `╰${LINE_SHORT}╯`,
    '',
    `${E.check} Enviados: ${sent}`,
    `${E.cross} Fallidos: ${failed}`,
    `${E.warn} Omitidos: ${skipped}`,
    '',
    toItalic('revision completa en el registro de auditoria'),
  ].join('\n');
}
