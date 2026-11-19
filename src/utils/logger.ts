import pino from 'pino';
import { config } from '../config';
import { THEME } from '../config/theme';

/**
 * Stream sincrónico: evita el transport worker de pino-pretty.
 * Si el worker muere, cualquier logger.warn lanzaba 'the worker has exited'
 * y tumbaba todo el proceso durante un envío fallido.
 */
const prettyStream = {
  write(line: string): void {
    try {
      const rec = JSON.parse(line) as {
        level?: number;
        time?: number;
        msg?: string;
        err?: { message?: string };
        [key: string]: unknown;
      };
      const level = String(rec.level ?? 'info').toUpperCase();
      const time = rec.time ? new Date(rec.time).toLocaleTimeString('es-MX') : '';
      const extra = Object.entries(rec)
        .filter(([key]) => !['level', 'time', 'msg', 'err'].includes(key))
        .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
        .join(' ');
      const err = rec.err?.message ? ` (${rec.err.message})` : '';
      process.stderr.write(`[${time}] ${level} ${THEME.emoji.capibara} ${rec.msg ?? ''}${err}${extra ? ` ${extra}` : ''}\n`);
    } catch {
      process.stderr.write(line);
    }
  },
};

export const logger = pino(
  {
    level: config.logLevel,
    formatters: { level: (label) => ({ level: label.toUpperCase() }) },
    serializers: { err: pino.stdSerializers.err },
  },
  prettyStream,
);

/** Reduces ruido de errores de Baileys: solo el mensaje, no el stack completo. */
export function logError(err: unknown, message: string): void {
  logger.error({ err: { message: err instanceof Error ? err.message : String(err) } }, message);
}

/** Banner de arranque con identidad visual Capibara. */
export function banner(): void {
  const { ansi } = THEME;
  console.log(`${ansi.brown}${ansi.bold}`);
  console.log('   ╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮');
  console.log('   ┃   🦫  B O T  C A P I B A R A  S P A M   ┃');
  console.log('   ┃   📢  GESTIÓN DE CAMPAÑAS v' + THEME.version.padEnd(11) + ' ┃');
  console.log('   ╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯');
  console.log(ansi.reset);
  console.log(`${ansi.beige}   Gestión profesional de campañas y anuncios${ansi.reset}`);
  console.log(`${ansi.cream}   v${THEME.version} · Prefijo ${config.prefix}${ansi.reset}\n`);
}
