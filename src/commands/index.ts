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

const index = new Map<string, Command>();
for (const command of commands) {
  index.set(command.name.toLowerCase(), command);
  for (const alias of command.aliases ?? []) index.set(alias.toLowerCase(), command);
}

export function findCommand(name: string): Command | undefined {
  return index.get(name.toLowerCase());
}

export function allCommands(): readonly Command[] {
  return commands;
}
