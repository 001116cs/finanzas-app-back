import type { INestApplication } from '@nestjs/common';
import { crearPipeValidacion } from './pipe-validacion.js';

/** Configuración HTTP común a producción y tests: validación global y CORS restringido al front. */
export function configurarApp(app: INestApplication, frontUrl: string) {
  app.useGlobalPipes(crearPipeValidacion());
  app.enableCors({ origin: [frontUrl] });
}
