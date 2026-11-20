import { INestApplication } from '@nestjs/common';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { DB } from '../src/db/db.module.js';
import * as schema from '../src/db/schema.js';
import { crearAppTest } from './helpers/app.js';
import { migrarBdTest, truncarTodo } from './helpers/db.js';

const A = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';
const B = '7c1d8e2f-3b4a-4c5d-8e6f-1a2b3c4d5e6f';
const authA = { Authorization: `Bearer token-${A}` };
const authB = { Authorization: `Bearer token-${B}` };
const perfil = { moneda: 'PEN', zonaHoraria: 'America/Lima' };

describe('categorias', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const db = () => app.get<PostgresJsDatabase<typeof schema>>(DB);

  beforeAll(async () => {
    await migrarBdTest();
    app = await crearAppTest();
  });
  beforeEach(async () => {
    await truncarTodo();
    await http().post('/perfil').set(authA).send(perfil).expect(201);
    await http().post('/perfil').set(authB).send(perfil).expect(201);
  });
  afterAll(async () => {
    await app.close();
  });

  it('sin token -> 401', async () => {
    await http().get('/categorias').expect(401);
  });

  it('GET lista las 10 sugeridas ordenadas por nombre', async () => {
    const res = await http().get('/categorias').set(authA).expect(200);
    expect(res.body).toHaveLength(10);
    const nombres = res.body.map((c: { nombre: string }) => c.nombre);
    expect(nombres).toEqual(
      [...nombres].sort((x: string, y: string) => x.localeCompare(y)),
    );
    expect(res.body[0]).toEqual({
      id: expect.any(String),
      nombre: expect.any(String),
      tipo: expect.any(String),
      cantidadMovimientos: 0,
    });
  });

  it('POST crea -> 201 con cantidadMovimientos 0 y recorta el nombre', async () => {
    const res = await http()
      .post('/categorias')
      .set(authA)
      .send({ nombre: '  Mascotas ', tipo: 'gasto' })
      .expect(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      nombre: 'Mascotas',
      tipo: 'gasto',
      cantidadMovimientos: 0,
    });
  });

  it('POST duplicado ("comida" vs Comida de gasto) -> 409; mismo nombre en ingreso OK', async () => {
    const res = await http()
      .post('/categorias')
      .set(authA)
      .send({ nombre: 'comida', tipo: 'gasto' })
      .expect(409);
    expect(res.body.codigo).toBe('CATEGORIA_DUPLICADA');
    await http()
      .post('/categorias')
      .set(authA)
      .send({ nombre: 'comida', tipo: 'ingreso' })
      .expect(201);
  });

  it('POST inválido -> 400 (vacío, 51 chars, tipo malo, campo extra)', async () => {
    for (const cuerpo of [
      { nombre: '', tipo: 'gasto' },
      { nombre: 'a'.repeat(51), tipo: 'gasto' },
      { nombre: 'X', tipo: 'otro' },
      { nombre: 'X', tipo: 'gasto', userId: B },
    ])
      await http().post('/categorias').set(authA).send(cuerpo).expect(400);
  });

  it('GET ?tipo=ingreso devuelve sólo ingresos; tipo inválido -> 400', async () => {
    const res = await http()
      .get('/categorias?tipo=ingreso')
      .set(authA)
      .expect(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.every((c: { tipo: string }) => c.tipo === 'ingreso')).toBe(
      true,
    );
    await http().get('/categorias?tipo=zzz').set(authA).expect(400);
  });

  it('cantidadMovimientos refleja las transacciones insertadas en la BD', async () => {
    const lista = await http().get('/categorias?tipo=gasto').set(authA);
    const comida = lista.body.find(
      (c: { nombre: string }) => c.nombre === 'Comida',
    );
    await db()
      .insert(schema.transactions)
      .values(
        [1, 2, 3].map((n) => ({
          userId: A,
          tipo: 'gasto' as const,
          monto: `${n}.00`,
          fecha: '2026-11-01',
          descripcion: `t${n}`,
          categoryId: comida.id,
        })),
      );
    const res = await http()
      .get('/categorias?tipo=gasto')
      .set(authA)
      .expect(200);
    const filas = res.body as { nombre: string; cantidadMovimientos: number }[];
    expect(filas.find((c) => c.nombre === 'Comida')!.cantidadMovimientos).toBe(
      3,
    );
    expect(
      filas
        .filter((c) => c.nombre !== 'Comida')
        .every((c) => c.cantidadMovimientos === 0),
    ).toBe(true);
  });

  it('PATCH renombra (tipo intacto); duplicado -> 409; tipo en body -> 400', async () => {
    const c = (
      await http()
        .post('/categorias')
        .set(authA)
        .send({ nombre: 'Temp', tipo: 'gasto' })
    ).body;
    const res = await http()
      .patch(`/categorias/${c.id}`)
      .set(authA)
      .send({ nombre: ' Nuevo ' })
      .expect(200);
    expect(res.body).toEqual({ ...c, nombre: 'Nuevo' });
    const dup = await http()
      .patch(`/categorias/${c.id}`)
      .set(authA)
      .send({ nombre: 'comida' })
      .expect(409);
    expect(dup.body.codigo).toBe('CATEGORIA_DUPLICADA');
    await http()
      .patch(`/categorias/${c.id}`)
      .set(authA)
      .send({ nombre: 'Z', tipo: 'ingreso' })
      .expect(400);
    await http()
      .patch(`/categorias/${c.id}`)
      .set(authA)
      .send({ nombre: '' })
      .expect(400);
  });

  it('usuario B: PATCH sobre categoría de A -> 404 y el nombre no cambia', async () => {
    const c = (
      await http()
        .post('/categorias')
        .set(authA)
        .send({ nombre: 'Privada', tipo: 'gasto' })
    ).body;
    await http()
      .patch(`/categorias/${c.id}`)
      .set(authB)
      .send({ nombre: 'Hackeada' })
      .expect(404);
    const [fila] = await db()
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, c.id));
    expect(fila.nombre).toBe('Privada');
  });

  it('PATCH con id inexistente o no uuid -> 404 / 400', async () => {
    await http()
      .patch('/categorias/00000000-0000-4000-8000-000000000000')
      .set(authA)
      .send({ nombre: 'X' })
      .expect(404);
    await http()
      .patch('/categorias/abc')
      .set(authA)
      .send({ nombre: 'X' })
      .expect(400);
  });

  it('GET de B no incluye categorías de A', async () => {
    await http()
      .post('/categorias')
      .set(authA)
      .send({ nombre: 'SoloA', tipo: 'gasto' });
    const res = await http().get('/categorias').set(authB).expect(200);
    expect(res.body).toHaveLength(10);
    expect(res.body.map((c: { nombre: string }) => c.nombre)).not.toContain(
      'SoloA',
    );
  });
});
