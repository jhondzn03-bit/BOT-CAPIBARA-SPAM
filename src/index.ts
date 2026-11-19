import { startBot } from './core/Client';
import { logger } from './utils/logger';

startBot().catch((err) => {
  logger.error({ err }, 'Error fatal al iniciar el bot');
  process.exit(1);
});
