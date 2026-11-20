import type { Command } from '../types';
import { anunciosCommands } from './anuncios';
import { destinosCommands } from './destinos';
import { generalCommands } from './general';
import { programacionCommands } from './programacion';

export const commands: Command[] = [
  ...destinosCommands,
  ...anunciosCommands,
  ...programacionCommands,
  ...generalCommands,
];

/** "auditoría" -> "auditoria", "campañas" -> "campanas", etc. */
function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const index = new Map<string, Command>();
for (const command of commands) {
  index.set(normalize(command.name), command);
  for (const alias of command.aliases ?? []) index.set(normalize(alias), command);
}

export function findCommand(name: string): Command | undefined {
  return index.get(normalize(name));
}

export function allCommands(): readonly Command[] {
  return commands;
}
