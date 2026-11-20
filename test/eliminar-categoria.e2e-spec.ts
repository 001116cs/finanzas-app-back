import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearAppTest } from './helpers/app.js';
import { migrarBdTest, truncarTodo } from './helpers/db.js';

const A = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';
const B = '7c1d8e2f-3b4a-4c5d-8e6f-1a2b3c4d5e6f';
const authA = { Authorization: `Bearer token-${A}` };
const authB = { Authorization: `Bearer token-${B}` };
const perfil = { moneda: 'PEN', zonaHoraria: 'America/Lima' };

type Cat = { id: string; nombre: string; tipo: string };

describe('DELETE /categorias/:id', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

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

  const crearCat = async (auth: Record<string, string>, nombre: string, tipo = 'gasto') =>
    (
      await http()
        .post('/categorias')
        .set(auth)
        .send({ nombre, tipo })
        .expect(201)
    ).body as Cat;

  const crearMovs = async (
    auth: Record<string, string>,
    categoriaId: string,
    tipo = 'gasto',
  ) => {
    for (const n of [1, 2, 3])
      await http()
        .post('/transacciones')
        .set(auth)
        .send({
          tipo,
          monto: '12.50',
          fecha: '2026-11-01',
          descripcion: `m${n}`,
          categoriaId,
        })
        .expect(201);
  };

  const movs = async (auth: Record<string, string>) =>
    (await http().get('/transacciones').set(auth).expect(200)).body;

  const conteo = async (auth: Record<string, string>, id: string) =>
    (
      (await http().get('/categorias').set(auth).expect(200)).body as (Cat & {
        cantidadMovimientos: number;
      })[]
    ).find((c) => c.id === id);

  it('sin movimientos y sin modo -> 204 y desaparece', async () => {
    const c = await crearCat(authA, 'Vacia');
    await http().delete(`/categorias/${c.id}`).set(authA).expect(204);
    expect(await conteo(authA, c.id)).toBeUndefined();
  });

  it('con movimientos y sin modo -> 400 MODO_REQUERIDO, sin cambios', async () => {
    const c = await crearCat(authA, 'Con');
    await crearMovs(authA, c.id);
    const res = await http()
      .delete(`/categorias/${c.id}`)
      .set(authA)
      .expect(400);
    expect(res.body.codigo).toBe('MODO_REQUERIDO');
    expect((await conteo(authA, c.id))!.cantidadMovimientos).toBe(3);
  });

  it('modo inválido -> 400; destinoId no uuid -> 400', async () => {
    const c = await crearCat(authA, 'X');
    await http().delete(`/categorias/${c.id}?modo=zzz`).set(authA).expect(400);
    await http()
      .delete(`/categorias/${c.id}?modo=mover&destinoId=abc`)
      .set(authA)
      .expect(400);
  });

  it('eliminar_movimientos borra los 3 movimientos y la categoría', async () => {
    const c = await crearCat(authA, 'Borrar');
    await crearMovs(authA, c.id);
    await http()
      .delete(`/categorias/${c.id}?modo=eliminar_movimientos`)
      .set(authA)
      .expect(204);
    expect(await conteo(authA, c.id)).toBeUndefined();
    expect(JSON.stringify(await movs(authA))).not.toContain('"m1"');
    expect(JSON.stringify(await movs(authA))).not.toContain(c.id);
  });

  it('conservar_sin_categoria deja los 3 con categoriaId null', async () => {
    const c = await crearCat(authA, 'Conservar');
    await crearMovs(authA, c.id);
    await http()
      .delete(`/categorias/${c.id}?modo=conservar_sin_categoria`)
      .set(authA)
      .expect(204);
    expect(await conteo(authA, c.id)).toBeUndefined();
    const body = await movs(authA);
    const items = (Array.isArray(body) ? body : body.items) as {
      descripcion: string;
      categoriaId: string | null;
    }[];
    const mios = items.filter((t) => /^m[123]$/.test(t.descripcion));
    expect(mios).toHaveLength(3);
    expect(mios.every((t) => t.categoriaId === null)).toBe(true);
  });

  it('mover a categoría del mismo tipo pasa los 3 a la destino', async () => {
    const c = await crearCat(authA, 'Origen');
    const d = await crearCat(authA, 'Destino');
    await crearMovs(authA, c.id);
    await http()
      .delete(`/categorias/${c.id}?modo=mover&destinoId=${d.id}`)
      .set(authA)
      .expect(204);
    expect(await conteo(authA, c.id)).toBeUndefined();
    expect((await conteo(authA, d.id))!.cantidadMovimientos).toBe(3);
  });

  it('mover con destino inválido -> 400 DESTINO_INVALIDO sin cambios', async () => {
    const c = await crearCat(authA, 'Origen');
    const otroTipo = await crearCat(authA, 'Ingr', 'ingreso');
    const deB = await crearCat(authB, 'DeB');
    await crearMovs(authA, c.id);
    const casos = [
      `modo=mover`,
      `modo=mover&destinoId=${c.id}`,
      `modo=mover&destinoId=${otroTipo.id}`,
      `modo=mover&destinoId=${deB.id}`,
      `modo=mover&destinoId=00000000-0000-4000-8000-000000000000`,
    ];
    for (const q of casos) {
      const res = await http()
        .delete(`/categorias/${c.id}?${q}`)
        .set(authA)
        .expect(400);
      expect(res.body.codigo).toBe('DESTINO_INVALIDO');
    }
    expect((await conteo(authA, c.id))!.cantidadMovimientos).toBe(3);
    expect((await conteo(authB, deB.id))!.cantidadMovimientos).toBe(0);
  });

  it('B borra categoría de A -> 404 y nada cambia; id inexistente -> 404', async () => {
    const c = await crearCat(authA, 'Privada');
    await crearMovs(authA, c.id);
    await http()
      .delete(`/categorias/${c.id}?modo=eliminar_movimientos`)
      .set(authB)
      .expect(404);
    expect((await conteo(authA, c.id))!.cantidadMovimientos).toBe(3);
    await http()
      .delete('/categorias/00000000-0000-4000-8000-000000000000')
      .set(authA)
      .expect(404);
  });
});
