import type { WAMessage, WASocket } from '@whiskeysockets/baileys';

/** Estado de autorización de un grupo (modelo de consentimiento). */
export type GroupStatus = 'pendiente' | 'autorizado' | 'excluido';

/** Tipos de anuncio soportados. */
export type CampaignType = 'texto' | 'imagen' | 'video' | 'audio' | 'documento' | 'sticker';

/** Estado de una campaña. */
export type CampaignStatus = 'borrador' | 'guardada' | 'enviada';

/** Contenido multipart de una campaña. */
export interface CampaignContent {
  text?: string;
  caption?: string;
  mediaPath?: string;
  fileName?: string;
  mimetype?: string;
  /** Botón de llamada a la acción (CTA URL). */
  button?: { text: string; url: string };
  /** Mostrar vista previa de enlaces en el anuncio. */
  linkPreview?: boolean;
}

/** Campaña programada para envío automático. */
export interface ScheduledCampaign {
  id: string;
  campaignId: string;
  executeAt: number;
  status: 'pendiente' | 'enviada' | 'cancelada';
  createdAt: number;
  /** Si se define, la campaña se reenvía cada N minutos. */
  repeatMinutes?: number;
}

/** Registro de un grupo en el directorio. */
export interface GroupRecord {
  id: string;
  name: string;
  subject?: string;
  participants?: number;
  status: GroupStatus;
  selected: boolean;
  addedAt: number;
  authorizedAt?: number;
  lastSentAt?: number;
  sendsToday: number;
  notes?: string;
}

/** Campaña / anuncio guardado. */
export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  content: CampaignContent;
  status: CampaignStatus;
  createdAt: number;
  updatedAt: number;
  sentAt?: number;
  /** Mensajes enviados en el último envío. */
  sentCount?: number;
  /** Total acumulado de mensajes enviados por esta campaña. */
  totalSent?: number;
}

/** Entrada del registro de auditoría. */
export interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  actor: string;
  timestamp: number;
}

/** Formato persistente del almacén. */
export interface StoreData {
  groups: Record<string, GroupRecord>;
  campaigns: Record<string, Campaign>;
  scheduled: ScheduledCampaign[];
  audit: AuditEntry[];
  settings: {
    sendDelayMs: number;
    maxSendsPerGroupDay: number;
    maxGroupsPerCampaign: number;
    requireAuthorization: boolean;
    /** Marcar automáticamente como leídos los mensajes que llegan. */
    autoRead: boolean;
    /** Tiempo mínimo (ms) entre envíos de UNA MISMA campaña a UN MISMO grupo. 0 = sin control. */
    groupCooldownMs: number;
  };
  /** Último envío por campaña y grupo: `${campaignId}:${groupId}` -> timestamp. */
  deliveries: Record<string, number>;
  /** Interruptor global: true = no se envía ningún mensaje a grupos. */
  paused: boolean;
}

/** Contexto pasado a cada comando. */
export interface CommandContext {
  sock: WASocket;
  msg: WAMessage;
  jid: string;
  sender: string;
  args: string[];
  fullArgs: string;
  command: string;
  isOwner: boolean;
  usageHint: string;
  quoted?: WAMessage;
  reply: (text: string) => Promise<void>;
  react: (emoji: string) => Promise<void>;
}

/** Definición de un comando. */
export interface Command {
  name: string;
  aliases?: string[];
  category: 'destinos' | 'anuncios' | 'general';
  description: string;
  usage: string;
  ownerOnly?: boolean;
  minArgs?: number;
  run: (ctx: CommandContext) => Promise<void> | void;
}
