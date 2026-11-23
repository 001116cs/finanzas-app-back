import type { NestExpressApplication } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import { crearPipeValidacion } from './pipe-validacion.js';

/** 2.000 filas de importación pesan ~250 KB; el límite por defecto (100 KB) no alcanza. */
export const LIMITE_JSON = '2mb';

/** Configuración HTTP común a producción y tests: validación global, límite de cuerpo y CORS restringido al front. */
export function configurarApp(app: INestApplication, frontUrl: string) {
  (app as NestExpressApplication).useBodyParser('json', {
    limit: LIMITE_JSON,
  });
  app.useGlobalPipes(crearPipeValidacion());
  app.enableCors({ origin: [frontUrl.replace(/\/+$/, '')] });
}
