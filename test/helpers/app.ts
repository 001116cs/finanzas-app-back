import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { NoAutenticadoError } from '../../src/compartido/errores.js';
import {
  VERIFICADOR_DE_TOKEN,
  type VerificadorDeToken,
} from '../../src/compartido/auth/verificador-de-token.js';
import { crearPipeValidacion } from '../../src/compartido/pipe-validacion.js';
import { urlBdTest } from './db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Acepta `token-<uuid>` y devuelve ese uuid como userId. */
export class VerificadorFalso implements VerificadorDeToken {
  async verificar(token: string): Promise<{ userId: string }> {
    const m = /^token-(.+)$/.exec(token);
    if (!m || !UUID.test(m[1])) throw new NoAutenticadoError('Token inválido');
    return { userId: m[1] };
  }
}

/** `extras`: módulos adicionales sólo para tests (rutas de prueba). */
export async function crearAppTest(
  extras: Type<unknown>[] = [],
): Promise<INestApplication> {
  process.env.DATABASE_URL = urlBdTest();
  const modulo = await Test.createTestingModule({
    imports: [AppModule, ...extras],
  })
    .overrideProvider(VERIFICADOR_DE_TOKEN)
    .useValue(new VerificadorFalso())
    .compile();
  const app = modulo.createNestApplication();
  app.useGlobalPipes(crearPipeValidacion());
  await app.init();
  return app;
}
