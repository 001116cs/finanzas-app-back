import { INestApplication, Type } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { NoAutenticadoError } from '../../src/compartido/errores.js';
import {
  VERIFICADOR_DE_TOKEN,
  type VerificadorDeToken,
} from '../../src/compartido/auth/verificador-de-token.js';
import { configurarApp } from '../../src/compartido/configurar-app.js';
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

/** `extras`: módulos adicionales sólo para tests (rutas de prueba). `ajustar`: overrides extra (p. ej. RELOJ). */
export async function crearAppTest(
  extras: Type<unknown>[] = [],
  ajustar: (b: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<INestApplication> {
  process.env.DATABASE_URL = urlBdTest();
  const builder = Test.createTestingModule({
    imports: [AppModule, ...extras],
  })
    .overrideProvider(VERIFICADOR_DE_TOKEN)
    .useValue(new VerificadorFalso());
  const modulo = await ajustar(builder).compile();
  const app = modulo.createNestApplication();
  configurarApp(app, process.env.FRONT_URL ?? 'http://localhost:3000');
  await app.init();
  return app;
}
