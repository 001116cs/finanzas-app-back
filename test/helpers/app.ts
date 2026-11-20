import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { urlBdTest } from './db.js';

export async function crearAppTest(): Promise<INestApplication> {
  process.env.DATABASE_URL = urlBdTest();
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication();
  await app.init();
  return app;
}
