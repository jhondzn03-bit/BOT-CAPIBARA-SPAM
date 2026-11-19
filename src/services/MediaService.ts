import fs from 'node:fs/promises';
import path from 'node:path';
import { downloadMediaMessage, type WAMessage, type WASocket } from '@whiskeysockets/baileys';
import { config } from '../config';
import { shortId } from '../utils/helpers';

export interface StoredMedia {
  mediaPath: string;
  fileName: string;
  mimetype: string;
}

/** Detecta el tipo de medio contenido en un mensaje. */
export function detectMediaType(msg: WAMessage): 'imagen' | 'video' | 'audio' | 'documento' | 'sticker' | null {
  const m = msg.message;
  if (!m) return null;
  if (m.imageMessage) return 'imagen';
  if (m.videoMessage) return 'video';
  if (m.audioMessage) return 'audio';
  if (m.documentMessage) return 'documento';
  if (m.stickerMessage) return 'sticker';
  return null;
}

/** Descarga el archivo adjunto de un mensaje y lo guarda en disco. */
export async function saveMedia(msg: WAMessage, sock?: WASocket): Promise<StoredMedia> {
  // El ctx permite solicitar el reupload cuando WhatsApp responde 404/410
  // (caso típico de imágenes respondidas o mensajes antiguos).
  const ctx = sock
    ? { reuploadRequest: (m: WAMessage) => sock.updateMediaMessage(m), logger: sock.logger }
    : undefined;
  const buffer = await downloadMediaMessage(msg, 'buffer', {}, ctx);

  const type = detectMediaType(msg) ?? 'documento';
  const m = msg.message!;
  const rawName =
    m.documentMessage?.fileName ??
    `capibara_${type}`;
  const mimetype =
    m.documentMessage?.mimetype ??
    m.imageMessage?.mimetype ??
    m.videoMessage?.mimetype ??
    m.audioMessage?.mimetype ??
    m.stickerMessage?.mimetype ??
    'application/octet-stream';

  const extension = path.extname(rawName) || guessExtension(mimetype);
  const fileName = `${shortId('media_')}${extension}`;
  const mediaPath = path.join(config.paths.mediaDir, fileName);
  await fs.writeFile(mediaPath, buffer);

  return { mediaPath, fileName: rawName, mimetype };
}

function guessExtension(mimetype: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
    'video/mp4': '.mp4', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3', 'application/pdf': '.pdf',
    'image/webp; codecs=vp9': '.webp',
  };
  return map[mimetype] ?? '.bin';
}

/** Construye el objeto `content` de sendMessage para una campaña con archivo. */
export function buildMessagePayload(
  type: string,
  mediaPath?: string,
  fileName?: string,
  text?: string,
  extras?: { button?: { text: string; url: string }; linkPreview?: boolean },
): Record<string, unknown> {
  let payload: Record<string, unknown>;

  if (!mediaPath) {
    payload = { text: text ?? '' };
    // Botón CTA (solo en anuncios de texto).
    if (extras?.button) {
      payload.nativeFlowMessage = {
        buttons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: extras.button.text,
              url: extras.button.url,
              merchant_url: extras.button.url,
            }),
          },
        ],
        messageParamsJson: '',
      };
    }
    if (extras?.linkPreview === false) payload.linkPreview = null;
    return payload;
  }

  const base: Record<string, unknown> = {
    image: { url: mediaPath },
    caption: text ?? '',
  };

  switch (type) {
    case 'video':
      payload = { video: { url: mediaPath }, caption: text ?? '' };
      break;
    case 'audio':
      payload = { audio: { url: mediaPath }, mimetype: 'audio/mp4', ptt: false };
      break;
    case 'documento':
      payload = { document: { url: mediaPath }, fileName: fileName ?? 'documento', caption: text ?? '' };
      break;
    case 'sticker':
      payload = { sticker: { url: mediaPath } };
      break;
    default:
      payload = base;
  }

  if (extras?.linkPreview === false) payload.linkPreview = null;
  return payload;
}
