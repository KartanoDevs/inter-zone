import { existsSync } from 'node:fs';

// Carga .env con la API nativa de Node (20.6+) — sin depender de dotenv, un paquete más.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
