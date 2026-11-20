// Carga .env si existe (en producción las variables vienen del entorno).
try {
  process.loadEnvFile();
} catch {
  // sin .env
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarApp } from './compartido/configurar-app.js';
import { montarSwaggerUi } from './compartido/openapi.js';
import { cargarEnv } from './config/env.js';

async function bootstrap() {
  const env = cargarEnv();
  const app = await NestFactory.create(AppModule);
  configurarApp(app, env.FRONT_URL);
  montarSwaggerUi(app, process.env.NODE_ENV === 'production');
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}
await bootstrap();
