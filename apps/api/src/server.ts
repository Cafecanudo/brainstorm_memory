import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDatabase, runMigrations } from './db/client.js';
import { LocalDiskStorage } from './storage/local-disk-storage.js';

const env = loadEnv();
const { db, pool } = createDatabase(env.DATABASE_URL);
await runMigrations(db);

const storage = new LocalDiskStorage(env.STORAGE_DIR);
await storage.init();

const app = await buildApp({ env, db, storage });

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await pool.end();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await app.listen({ host: env.HOST, port: env.PORT });
