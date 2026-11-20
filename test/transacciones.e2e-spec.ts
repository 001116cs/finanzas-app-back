import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearAppTest } from './helpers/app.js';
import { migrarBdTest, truncarTodo } from './helpers/db.js';

const A = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';
const B = '7c1d8e2f-3b4a-4c5d-8e6f-1a2b3c4d5e6f';
const authA = { Authorization: `Bearer token-${A}` };
const authB = { Authorization: `Bearer token-${B}` };
const perfil = { moneda: 'PEN', zonaHoraria: 'America/Lima' };

describe('transacciones', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  async function categoria(auth: object, tipo: string, nombre?: string) {
    const lista = await http()
      .get(`/categorias?tipo=${tipo}`)
      .set(auth)
      .expect(200);
    const c = nombre
      ? lista.body.find((x: { nombre: string }) => x.nombre === nombre)
      : lista.body[0];
    return c.id as string;
  }
  const gasto = (over: object = {}) => ({
    tipo: 'gasto',
    monto: '12.50',
    fecha: '2026-03-10',
    descripcion: 'Almuerzo',
    categoriaId: null,
    ...over,
  });
  const crear = async (auth: object, body: object) =>
    (await http().post('/transacciones').set(auth).send(body).expect(201)).body;

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
    await http().get('/transacciones').expect(401);
  });

  it('crea un gasto con categoría -> 201 con forma completa', async () => {
    const cat = await categoria(authA, 'gasto', 'Comida');
    const res = await http()
      .post('/transacciones')
      .set(authA)
      .send(
        gasto({ monto: '12.5', categoriaId: cat, descripcion: '  Almuerzo ' }),
      )
      .expect(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      tipo: 'gasto',
      monto: '12.50',
      fecha: '2026-03-10',
      descripcion: 'Almuerzo',
      categoriaId: cat,
      categoriaNombre: 'Comida',
      origen: 'manual',
      createdAt: expect.any(String),
    });
  });

  it('categoriaId null -> 201 con categoriaNombre null', async () => {
    const t = await crear(authA, gasto());
    expect(t.categoriaId).toBeNull();
    expect(t.categoriaNombre).toBeNull();
  });

  it('rechaza montos mal formados, incluido número JSON', async () => {
    await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ monto: 12.5 }))
      .expect(400);
    for (const monto of [
      '0',
      '-5.00',
      '1,50',
      '12.345',
      'abc',
      '99999999999.00',
    ]) {
      const res = await http()
        .post('/transacciones')
        .set(authA)
        .send(gasto({ monto }))
        .expect(400);
      expect(res.body.codigo).toBe('MONTO_INVALIDO');
    }
    expect((await http().get('/transacciones').set(authA)).body.total).toBe(0);
  });

  it('fecha inexistente o mal formada -> 400', async () => {
    await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ fecha: '2026-02-30' }))
      .expect(400);
    await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ fecha: '10/03/2026' }))
      .expect(400);
  });

  it('descripcion vacía o larga, tipo inválido, userId extra -> 400', async () => {
    await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ descripcion: '  ' }))
      .expect(400);
    await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ descripcion: 'a'.repeat(201) }))
      .expect(400);
    await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ tipo: 'otro' }))
      .expect(400);
    await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ userId: B }))
      .expect(400);
    await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ categoriaId: 'x' }))
      .expect(400);
  });

  it('categoría de ingreso en un gasto -> 400 CATEGORIA_INCOMPATIBLE', async () => {
    const ing = await categoria(authA, 'ingreso');
    const res = await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ categoriaId: ing }))
      .expect(400);
    expect(res.body.codigo).toBe('CATEGORIA_INCOMPATIBLE');
    expect((await http().get('/transacciones').set(authA)).body.total).toBe(0);
  });

  it('categoría de otro usuario -> 400 CATEGORIA_INCOMPATIBLE', async () => {
    const deB = await categoria(authB, 'gasto');
    const res = await http()
      .post('/transacciones')
      .set(authA)
      .send(gasto({ categoriaId: deB }))
      .expect(400);
    expect(res.body.codigo).toBe('CATEGORIA_INCOMPATIBLE');
  });

  it('lista ordenada por fecha desc y filtra por desde/hasta/tipo/categoriaId', async () => {
    const cat = await categoria(authA, 'gasto', 'Comida');
    await crear(
      authA,
      gasto({ fecha: '2026-03-01', descripcion: 'a', categoriaId: cat }),
    );
    await crear(authA, gasto({ fecha: '2026-03-20', descripcion: 'b' }));
    await crear(authA, {
      tipo: 'ingreso',
      monto: '100',
      fecha: '2026-03-10',
      descripcion: 'c',
      categoriaId: null,
    });
    await crear(authB, gasto({ descripcion: 'ajena' }));

    const todas = await http().get('/transacciones').set(authA).expect(200);
    expect(todas.body.total).toBe(3);
    expect(
      todas.body.items.map((t: { descripcion: string }) => t.descripcion),
    ).toEqual(['b', 'c', 'a']);

    const q = async (s: string) =>
      (
        await http().get(`/transacciones?${s}`).set(authA).expect(200)
      ).body.items.map((t: { descripcion: string }) => t.descripcion);
    expect(await q('desde=2026-03-10')).toEqual(['b', 'c']);
    expect(await q('hasta=2026-03-10')).toEqual(['c', 'a']);
    expect(await q('desde=2026-03-10&hasta=2026-03-10')).toEqual(['c']);
    expect(await q('tipo=ingreso')).toEqual(['c']);
    expect(await q(`categoriaId=${cat}`)).toEqual(['a']);
    expect(await q('categoriaId=sin')).toEqual(['b', 'c']);
    await http().get('/transacciones?desde=2026-02-30').set(authA).expect(400);
    await http().get('/transacciones?categoriaId=xyz').set(authA).expect(400);
  });

  it('misma fecha: desempata por createdAt desc', async () => {
    await crear(authA, gasto({ descripcion: 'primera' }));
    await crear(authA, gasto({ descripcion: 'segunda' }));
    const r = await http().get('/transacciones').set(authA).expect(200);
    expect(
      r.body.items.map((t: { descripcion: string }) => t.descripcion),
    ).toEqual(['segunda', 'primera']);
  });

  it('pagina con total correcto y valida tamano/pagina', async () => {
    for (let i = 1; i <= 5; i++)
      await crear(
        authA,
        gasto({ fecha: `2026-03-0${i}`, descripcion: `d${i}` }),
      );
    const p2 = await http()
      .get('/transacciones?pagina=2&tamano=2')
      .set(authA)
      .expect(200);
    expect(p2.body.total).toBe(5);
    expect(
      p2.body.items.map((t: { descripcion: string }) => t.descripcion),
    ).toEqual(['d3', 'd2']);
    const p3 = await http()
      .get('/transacciones?pagina=3&tamano=2')
      .set(authA)
      .expect(200);
    expect(p3.body.items).toHaveLength(1);
    await http().get('/transacciones?tamano=100').set(authA).expect(200);
    await http().get('/transacciones?tamano=101').set(authA).expect(400);
    await http().get('/transacciones?tamano=0').set(authA).expect(400);
    await http().get('/transacciones?pagina=0').set(authA).expect(400);
  });

  it('PATCH parcial, cambia categoría y valida compatibilidad', async () => {
    const cat = await categoria(authA, 'gasto', 'Comida');
    const t = await crear(authA, gasto({ categoriaId: cat }));
    const r = await http()
      .patch(`/transacciones/${t.id}`)
      .set(authA)
      .send({ monto: '20', descripcion: 'Cena' })
      .expect(200);
    expect(r.body).toMatchObject({
      monto: '20.00',
      descripcion: 'Cena',
      categoriaNombre: 'Comida',
      fecha: '2026-03-10',
    });
    const sin = await http()
      .patch(`/transacciones/${t.id}`)
      .set(authA)
      .send({ categoriaId: null })
      .expect(200);
    expect(sin.body.categoriaId).toBeNull();
    await http()
      .patch(`/transacciones/${t.id}`)
      .set(authA)
      .send({ monto: '0' })
      .expect(400);
    await http()
      .patch(`/transacciones/${t.id}`)
      .set(authA)
      .send({ monto: 5 })
      .expect(400);
    const ing = await categoria(authA, 'ingreso');
    const mal = await http()
      .patch(`/transacciones/${t.id}`)
      .set(authA)
      .send({ categoriaId: ing })
      .expect(400);
    expect(mal.body.codigo).toBe('CATEGORIA_INCOMPATIBLE');
  });

  it('PATCH de tipo con la categoría existente incompatible -> 400', async () => {
    const cat = await categoria(authA, 'gasto', 'Comida');
    const t = await crear(authA, gasto({ categoriaId: cat }));
    const r = await http()
      .patch(`/transacciones/${t.id}`)
      .set(authA)
      .send({ tipo: 'ingreso' })
      .expect(400);
    expect(r.body.codigo).toBe('CATEGORIA_INCOMPATIBLE');
    const ok = await http()
      .patch(`/transacciones/${t.id}`)
      .set(authA)
      .send({ tipo: 'ingreso', categoriaId: null })
      .expect(200);
    expect(ok.body.tipo).toBe('ingreso');
  });

  it('DELETE -> 204 y desaparece', async () => {
    const t = await crear(authA, gasto());
    await http().delete(`/transacciones/${t.id}`).set(authA).expect(204);
    expect((await http().get('/transacciones').set(authA)).body.total).toBe(0);
  });

  it('id no UUID -> 400', async () => {
    await http().patch('/transacciones/abc').set(authA).send({}).expect(400);
    await http().delete('/transacciones/abc').set(authA).expect(400);
  });

  it('B no puede PATCH, DELETE ni ver la transacción de A (404) y nada cambia', async () => {
    const t = await crear(authA, gasto());
    await http()
      .patch(`/transacciones/${t.id}`)
      .set(authB)
      .send({ monto: '999' })
      .expect(404);
    await http().delete(`/transacciones/${t.id}`).set(authB).expect(404);
    const lista = await http().get('/transacciones').set(authB).expect(200);
    expect(lista.body).toEqual({ items: [], total: 0 });
    const deA = await http().get('/transacciones').set(authA).expect(200);
    expect(deA.body.items).toEqual([t]);
  });

  it('PATCH con null en campo no nulo -> 400 y la fila no cambia', async () => {
    const t = await crear(authA, gasto());
    for (const campo of ['tipo', 'monto', 'fecha', 'descripcion'])
      await http()
        .patch(`/transacciones/${t.id}`)
        .set(authA)
        .send({ [campo]: null })
        .expect(400);
    const r = await http().get('/transacciones').set(authA).expect(200);
    expect(r.body.items).toEqual([t]);
  });

  it('total es correcto combinando filtro y paginación', async () => {
    for (let i = 1; i <= 3; i++)
      await crear(
        authA,
        gasto({ fecha: `2026-03-0${i}`, descripcion: `g${i}` }),
      );
    await crear(authA, {
      tipo: 'ingreso',
      monto: '5',
      fecha: '2026-03-05',
      descripcion: 'i',
      categoriaId: null,
    });
    const r = await http()
      .get('/transacciones?tipo=gasto&pagina=2&tamano=2')
      .set(authA)
      .expect(200);
    expect(r.body.total).toBe(3);
    expect(
      r.body.items.map((t: { descripcion: string }) => t.descripcion),
    ).toEqual(['g1']);
  });
});
