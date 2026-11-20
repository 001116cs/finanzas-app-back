import { INestApplication } from '@nestjs/common';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { DB } from '../src/db/db.module.js';
import * as schema from '../src/db/schema.js';
import { crearAppTest } from './helpers/app.js';
import { migrarBdTest, truncarTodo } from './helpers/db.js';

const U = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';
const auth = { Authorization: `Bearer token-${U}` };

describe('perfil', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    await migrarBdTest();
    app = await crearAppTest();
  });
  beforeEach(truncarTodo);
  afterAll(async () => {
    await app.close();
  });

  it('GET /perfil sin token -> 401 (no 409)', async () => {
    await http().get('/perfil').expect(401);
  });

  it('GET /perfil antes de crearlo -> 409 PERFIL_REQUERIDO', async () => {
    const res = await http().get('/perfil').set(auth).expect(409);
    expect(res.body.codigo).toBe('PERFIL_REQUERIDO');
  });

  it('POST /perfil -> 201, crea 10 categorías; repetir -> 200 sin duplicar', async () => {
    const cuerpo = { moneda: 'PEN', zonaHoraria: 'America/Lima' };
    const res = await http().post('/perfil').set(auth).send(cuerpo).expect(201);
    expect(res.body).toEqual({ id: U, ...cuerpo });

    const db = app.get<PostgresJsDatabase<typeof schema>>(DB);
    const cats = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.userId, U));
    expect(cats).toHaveLength(10);
    expect(cats.filter((c) => c.tipo === 'gasto')).toHaveLength(7);

    await http()
      .post('/perfil')
      .set(auth)
      .send({ moneda: 'USD', zonaHoraria: 'UTC' })
      .expect(200);
    expect(
      await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.userId, U)),
    ).toHaveLength(10);
    const g = await http().get('/perfil').set(auth).expect(200);
    expect(g.body.moneda).toBe('PEN');
  });

  it('GET /categorias devuelve las 10 sugeridas tras crear el perfil', async () => {
    await http()
      .post('/perfil')
      .set(auth)
      .send({ moneda: 'PEN', zonaHoraria: 'America/Lima' })
      .expect(201);
    const res = await http().get('/categorias').set(auth).expect(200);
    expect(res.body).toHaveLength(10);
  });

  it('POST con moneda inválida o campos extra -> 400', async () => {
    await http()
      .post('/perfil')
      .set(auth)
      .send({ moneda: 'XXQ', zonaHoraria: 'America/Lima' })
      .expect(400);
    await http()
      .post('/perfil')
      .set(auth)
      .send({ moneda: 'PEN', zonaHoraria: 'America/Lima', id: 'x' })
      .expect(400);
  });

  it('PATCH /perfil -> 200 y cambia la moneda; sin perfil -> 409', async () => {
    await http().patch('/perfil').set(auth).send({ moneda: 'USD' }).expect(409);
    await http()
      .post('/perfil')
      .set(auth)
      .send({ moneda: 'PEN', zonaHoraria: 'America/Lima' });
    const res = await http()
      .patch('/perfil')
      .set(auth)
      .send({ moneda: 'USD' })
      .expect(200);
    expect(res.body).toEqual({
      id: U,
      moneda: 'USD',
      zonaHoraria: 'America/Lima',
    });
  });
});
