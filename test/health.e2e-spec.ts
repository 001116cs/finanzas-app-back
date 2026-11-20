import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearAppTest } from './helpers/app.js';

describe('GET /health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppTest();
  });
  afterAll(async () => {
    await app.close();
  });

  it('responde 200 {status:"ok"}', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
