import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { crearPipeValidacion } from './compartido/pipe-validacion.js';
import { cargarEnv } from './config/env.js';

async function bootstrap() {
  const env = cargarEnv();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(crearPipeValidacion());
  app.enableShutdownHooks();
  app.enableCors({ origin: env.FRONT_URL });
  await app.listen(env.PORT);
}
await bootstrap();
