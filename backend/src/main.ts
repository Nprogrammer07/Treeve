import { existsSync } from 'node:fs';
import { loadEnv } from './infrastructure/config/env';
import { buildApp } from './infrastructure/composition';

// En desarrollo lee .env; en producción (Render, Docker) las variables vienen del entorno.
if (existsSync('.env')) process.loadEnvFile('.env');

const env = loadEnv();
const app = buildApp(env);

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Treeve API escuchando en :${env.PORT} (${env.NODE_ENV})`);
});

const apagar = () => server.close(() => process.exit(0));
process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);