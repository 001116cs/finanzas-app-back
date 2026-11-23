import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RELOJ } from '../src/compartido/reloj.js';
import { crearAppTest } from './helpers/app.js';
import { migrarBdTest, truncarTodo } from './helpers/db.js';

const A = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';
const B = '7c1d8e2f-3b4a-4c5d-8e6f-1a2b3c4d5e6f';
const authA = { Authorization: `Bearer token-${A}` };
const authB = { Authorization: `Bearer token-${B}` };
const perfil = { moneda: 'PEN', zonaHoraria: 'America/Lima' };
// 2026-11-22 03:00Z = 21 de noviembre 22:00 en Lima
const AHORA = new Date('2026-11-22T03:00:00Z');

const fila = (over: object = {}) => ({
  fecha: '2026-11-02',
  descripcion: 'PLIN-JUAN PEREZ',
  monto: '45.00',
  tipo: 'gasto',
  ...over,
});

describe('POST /importaciones/duplicados', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const guardar = (auth: Record<string, string>, body: object) =>
    http()
      .post('/transacciones')
      .set(auth)
      .send({
        tipo: 'gasto',
        monto: '45.00',
        fecha: '2026-11-02',
        descripcion: 'PLIN-JUAN PEREZ',
        categoriaId: null,
        ...body,
      })
      .expect(201);
  const duplicados = (auth: Record<string, string>, filas: unknown) =>
    http().post('/importaciones/duplicados').set(auth).send({ filas });

  beforeAll(async () => {
    await migrarBdTest();
    app = await crearAppTest([], (b) =>
      b.overrideProvider(RELOJ).useValue({ ahora: () => AHORA }),
    );
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
    await http()
      .post('/importaciones/duplicados')
      .send({ filas: [] })
      .expect(401);
  });

  it('marca la fila igual (sin importar mayúsculas ni espacios extremos)', async () => {
    await guardar(authA, {});
    const res = await duplicados(authA, [
      fila({ descripcion: 'plin-juan perez  ' }),
      fila({ descripcion: 'otra' }),
    ]).expect(200);
    expect(res.body).toEqual({ indices: [0] });
  });

  it('distinto tipo, monto o fecha no duplica', async () => {
    await guardar(authA, {});
    const res = await duplicados(authA, [
      fila({ tipo: 'ingreso' }),
      fila({ monto: '45.01' }),
      fila({ fecha: '2026-11-03' }),
    ]).expect(200);
    expect(res.body).toEqual({ indices: [] });
  });

  it('dos filas idénticas entre sí sin nada guardado -> []', async () => {
    const res = await duplicados(authA, [fila(), fila()]).expect(200);
    expect(res.body).toEqual({ indices: [] });
  });

  it('fecha null usa hoy en la zona del perfil (RELOJ fijo)', async () => {
    await guardar(authA, { fecha: '2026-11-21' });
    const res = await duplicados(authA, [
      fila({ fecha: null }),
      fila({ fecha: '2026-11-22' }),
    ]).expect(200);
    expect(res.body).toEqual({ indices: [0] });
  });

  it('movimientos de otro usuario no cuentan', async () => {
    await guardar(authB, {});
    const res = await duplicados(authA, [fila()]).expect(200);
    expect(res.body).toEqual({ indices: [] });
  });

  it('devuelve índices ascendentes en un lote mixto', async () => {
    await guardar(authA, {});
    await guardar(authA, { descripcion: 'Taxi', fecha: '2026-11-05' });
    const res = await duplicados(authA, [
      fila({ descripcion: 'x' }),
      fila({ descripcion: 'TAXI', fecha: '2026-11-05' }),
      fila({ descripcion: 'y' }),
      fila(),
    ]).expect(200);
    expect(res.body).toEqual({ indices: [1, 3] });
  });

  it('2001 filas -> 400 LOTE_DEMASIADO_GRANDE; 2000 pasa', async () => {
    const r = await duplicados(
      authA,
      Array.from({ length: 2001 }, () => fila()),
    ).expect(400);
    expect(r.body.codigo).toBe('LOTE_DEMASIADO_GRANDE');
    await duplicados(
      authA,
      Array.from({ length: 2000 }, () => fila()),
    ).expect(200);
  });

  it('[] -> 400 LOTE_VACIO', async () => {
    const r = await duplicados(authA, []).expect(400);
    expect(r.body.codigo).toBe('LOTE_VACIO');
  });

  it('fila inválida -> 400 con fila', async () => {
    const r = await duplicados(authA, [fila(), fila({ monto: '0' })]).expect(
      400,
    );
    expect(r.body).toMatchObject({ fila: 1 });
    const f = await duplicados(authA, [fila({ fecha: '2026-02-30' })]).expect(
      400,
    );
    expect(f.body).toMatchObject({ fila: 0 });
  });

  it('forma inválida (tipo desconocido, campo extra) -> 400', async () => {
    await duplicados(authA, [fila({ tipo: 'otro' })]).expect(400);
    await duplicados(authA, [fila({ extra: 1 })]).expect(400);
  });
});
