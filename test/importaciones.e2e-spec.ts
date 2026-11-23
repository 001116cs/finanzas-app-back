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

describe('POST /importaciones', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const guardar = (auth: Record<string, string>, body: object) =>
    http().post('/importaciones').set(auth).send(body);
  const lote = (filas: unknown[], over: object = {}) => ({
    nombreArchivo: 'extracto.csv',
    categoriasNuevas: [],
    filas,
    ...over,
  });
  const f = (over: object = {}) => ({
    fecha: '2026-11-02',
    descripcion: 'Compra',
    monto: '10.00',
    tipo: 'gasto',
    categoriaId: null,
    categoriaNueva: null,
    ...over,
  });
  const crearCategoria = async (
    auth: Record<string, string>,
    nombre: string,
    tipo = 'gasto',
  ) =>
    (
      await http()
        .post('/categorias')
        .set(auth)
        .send({ nombre, tipo })
        .expect(201)
    ).body as { id: string };
  // El perfil siembra categorías por defecto (p. ej. Comida)
  const categoriaSembrada = async (nombre: string) =>
    (
      (await http().get('/categorias').set(authA).expect(200)).body as {
        id: string;
        nombre: string;
      }[]
    ).find((c) => c.nombre === nombre)!;
  const movimientos = async (auth: Record<string, string>) =>
    (await http().get('/transacciones').set(auth).expect(200)).body.items as {
      descripcion: string;
      origen: string;
      fecha: string;
      categoriaNombre: string | null;
    }[];
  const categorias = async (auth: Record<string, string>) =>
    (await http().get('/categorias').set(auth).expect(200)).body as {
      nombre: string;
      tipo: string;
    }[];

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
      .post('/importaciones')
      .send(lote([f()]))
      .expect(401);
  });

  it('guarda el lote: origen excel, categoría existente, nueva, ninguna y fecha null = hoy', async () => {
    const comida = await categoriaSembrada('Comida');
    const res = await guardar(
      authA,
      lote(
        [
          f({ descripcion: 'uno', categoriaId: comida.id }),
          f({ descripcion: 'dos', categoriaNueva: 'Mascotas' }),
          f({ descripcion: 'tres' }),
          f({ descripcion: 'cuatro', fecha: null }),
        ],
        { categoriasNuevas: [{ nombre: 'Mascotas', tipo: 'gasto' }] },
      ),
    ).expect(201);
    expect(res.body).toMatchObject({
      nombreArchivo: 'extracto.csv',
      filasImportadas: 4,
    });
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.createdAt).toEqual(expect.any(String));
    const m = Object.fromEntries(
      (await movimientos(authA)).map((x) => [x.descripcion, x]),
    );
    expect(m.uno).toMatchObject({ origen: 'excel', categoriaNombre: 'Comida' });
    expect(m.dos).toMatchObject({
      origen: 'excel',
      categoriaNombre: 'Mascotas',
    });
    expect(m.tres).toMatchObject({ origen: 'excel', categoriaNombre: null });
    expect(m.cuatro.fecha).toBe('2026-11-21');
  });

  it('categoriasNuevas con nombre existente (otra capitalización) la reutiliza, sin 409', async () => {
    const comida = await categoriaSembrada('Comida');
    await guardar(
      authA,
      lote([f({ categoriaNueva: 'comida' })], {
        categoriasNuevas: [{ nombre: 'COMIDA', tipo: 'gasto' }],
      }),
    ).expect(201);
    const cats = (await categorias(authA)).filter(
      (c) => c.nombre.toLowerCase() === 'comida',
    );
    expect(cats).toHaveLength(1);
    const [m] = await movimientos(authA);
    expect(m.categoriaNombre).toBe('Comida');
    expect(comida.id).toBeDefined();
  });

  it('mismo nombre en ambos tipos: cada fila usa la categoría de su tipo', async () => {
    await guardar(
      authA,
      lote(
        [
          f({ descripcion: 'g', categoriaNueva: 'Varios' }),
          f({ descripcion: 'i', tipo: 'ingreso', categoriaNueva: 'Varios' }),
        ],
        {
          categoriasNuevas: [
            { nombre: 'Varios', tipo: 'gasto' },
            { nombre: 'Varios', tipo: 'ingreso' },
          ],
        },
      ),
    ).expect(201);
    expect(
      (await categorias(authA)).filter((c) => c.nombre === 'Varios'),
    ).toHaveLength(2);
  });

  it('fila 7 inválida de 10 -> 400 fila 6 (0-based) y no se guarda nada, ni categorías nuevas', async () => {
    const ajena = await crearCategoria(authB, 'De B');
    const filas = Array.from({ length: 10 }, (_, i) =>
      f({ descripcion: `m${i}`, categoriaNueva: i < 5 ? 'Mascotas' : null }),
    );
    filas[6] = f({ descripcion: 'mala', categoriaId: ajena.id });
    const antes = (await categorias(authA)).length;
    const res = await guardar(
      authA,
      lote(filas, {
        categoriasNuevas: [{ nombre: 'Mascotas', tipo: 'gasto' }],
      }),
    ).expect(400);
    expect(res.body).toMatchObject({
      codigo: 'CATEGORIA_INCOMPATIBLE',
      fila: 6,
    });
    expect(await movimientos(authA)).toHaveLength(0);
    expect(await categorias(authA)).toHaveLength(antes);
    expect(
      (await http().get('/importaciones').set(authA).expect(200)).body,
    ).toEqual([]);
  });

  it('categoriaId de otro usuario o de otro tipo -> 400 CATEGORIA_INCOMPATIBLE con fila', async () => {
    const ajena = await crearCategoria(authB, 'De B');
    const ingreso = await crearCategoria(authA, 'Premio raro', 'ingreso');
    const r1 = await guardar(
      authA,
      lote([f(), f({ categoriaId: ajena.id })]),
    ).expect(400);
    expect(r1.body).toMatchObject({
      codigo: 'CATEGORIA_INCOMPATIBLE',
      fila: 1,
    });
    const r2 = await guardar(
      authA,
      lote([f({ categoriaId: ingreso.id })]),
    ).expect(400);
    expect(r2.body).toMatchObject({
      codigo: 'CATEGORIA_INCOMPATIBLE',
      fila: 0,
    });
  });

  it('categoriaNueva no declarada, de otro tipo o junto a categoriaId -> 400 CATEGORIA_NUEVA_INVALIDA', async () => {
    const r1 = await guardar(
      authA,
      lote([f({ categoriaNueva: 'Mascotas' })]),
    ).expect(400);
    expect(r1.body).toMatchObject({
      codigo: 'CATEGORIA_NUEVA_INVALIDA',
      fila: 0,
    });
    const r2 = await guardar(
      authA,
      lote([f({ categoriaNueva: 'Mascotas' })], {
        categoriasNuevas: [{ nombre: 'Mascotas', tipo: 'ingreso' }],
      }),
    ).expect(400);
    expect(r2.body.codigo).toBe('CATEGORIA_NUEVA_INVALIDA');
    const comida = await categoriaSembrada('Comida');
    const r3 = await guardar(
      authA,
      lote([f({ categoriaNueva: 'Mascotas', categoriaId: comida.id })], {
        categoriasNuevas: [{ nombre: 'Mascotas', tipo: 'gasto' }],
      }),
    ).expect(400);
    expect(r3.body.codigo).toBe('CATEGORIA_NUEVA_INVALIDA');
  });

  it('nombre de categoría nueva inválido -> 400 y no se guarda nada', async () => {
    await guardar(
      authA,
      lote([f()], { categoriasNuevas: [{ nombre: '   ', tipo: 'gasto' }] }),
    ).expect(400);
    await guardar(
      authA,
      lote([f()], {
        categoriasNuevas: [{ nombre: 'x'.repeat(51), tipo: 'gasto' }],
      }),
    ).expect(400);
    expect(await movimientos(authA)).toHaveLength(0);
  });

  it('monto numérico, campos extra o tipo inválido -> 400', async () => {
    await guardar(authA, lote([f({ monto: 12.5 })])).expect(400);
    await guardar(authA, lote([f({ extra: 1 })])).expect(400);
    await guardar(authA, lote([f({ tipo: 'otro' })])).expect(400);
    await guardar(authA, lote([f({ categoriaId: 'no-uuid' })])).expect(400);
    await guardar(authA, lote([f({ monto: '0' })])).expect(400);
  });

  it('nombreArchivo vacío o de más de 255 -> 400; 255 pasa', async () => {
    await guardar(authA, lote([f()], { nombreArchivo: '' })).expect(400);
    await guardar(
      authA,
      lote([f()], { nombreArchivo: 'a'.repeat(256) }),
    ).expect(400);
    await guardar(
      authA,
      lote([f()], { nombreArchivo: 'a'.repeat(255) }),
    ).expect(201);
  });

  it('0 filas -> LOTE_VACIO; 2001 -> LOTE_DEMASIADO_GRANDE; 2000 pasa', async () => {
    const r0 = await guardar(authA, lote([])).expect(400);
    expect(r0.body.codigo).toBe('LOTE_VACIO');
    const rn = await guardar(
      authA,
      lote(Array.from({ length: 2001 }, () => f())),
    ).expect(400);
    expect(rn.body.codigo).toBe('LOTE_DEMASIADO_GRANDE');
    const ok = await guardar(
      authA,
      lote(Array.from({ length: 2000 }, () => f())),
    ).expect(201);
    expect(ok.body.filasImportadas).toBe(2000);
  });

  it('los movimientos son del usuario del token', async () => {
    await guardar(authA, lote([f()])).expect(201);
    expect(await movimientos(authB)).toHaveLength(0);
  });

  it('el extracto del banco (7 gastos y 3 ingresos, "Ambos") queda marcado como duplicado en las 10 filas', async () => {
    const cuerpo = (
      [
        ['2026-11-02', 'PLIN-JUAN PEREZ', '45.00', 'gasto'],
        ['2026-11-03', 'PAGO HABERES EMPRESA SAC', '3500.00', 'ingreso'],
        ['2026-11-04', 'COMPRA TOTTUS LA MARINA', '187.40', 'gasto'],
        ['2026-11-05', 'NETFLIX.COM', '44.90', 'gasto'],
        ['2026-11-07', 'RETIRO CAJERO BCP', '200.00', 'gasto'],
        ['2026-11-10', 'TRANSF. DE MARIA LOPEZ', '150.00', 'ingreso'],
        ['2026-11-12', 'PAGO LUZ DEL SUR', '96.30', 'gasto'],
        ['2026-11-15', 'UBER *TRIP', '18.50', 'gasto'],
        ['2026-11-18', 'DEVOLUCION SAGA FALABELLA', '79.90', 'ingreso'],
        ['2026-11-20', 'COMISION MANTENIMIENTO', '12.00', 'gasto'],
      ] as const
    ).map(([fecha, descripcion, monto, tipo]) =>
      f({ fecha, descripcion, monto, tipo }),
    );
    await guardar(
      authA,
      lote(cuerpo, { nombreArchivo: '1-extracto-banco.csv' }),
    ).expect(201);
    const res = await http()
      .post('/importaciones/duplicados')
      .set(authA)
      .send({
        filas: cuerpo.map(({ fecha, descripcion, monto, tipo }) => ({
          fecha,
          descripcion,
          monto,
          tipo,
        })),
      })
      .expect(200);
    expect(res.body).toEqual({ indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
  });
});

describe('GET /importaciones y DELETE /importaciones/:id', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const f = (descripcion: string, over: object = {}) => ({
    fecha: '2026-11-02',
    descripcion,
    monto: '10.00',
    tipo: 'gasto',
    categoriaId: null,
    categoriaNueva: null,
    ...over,
  });
  const importar = async (
    auth: Record<string, string>,
    nombreArchivo: string,
    filas: unknown[],
    categoriasNuevas: object[] = [],
  ) =>
    (
      await http()
        .post('/importaciones')
        .set(auth)
        .send({ nombreArchivo, categoriasNuevas, filas })
        .expect(201)
    ).body as { id: string };
  const movimientos = async (auth: Record<string, string>) =>
    (await http().get('/transacciones').set(auth).expect(200)).body.items as {
      id: string;
      descripcion: string;
    }[];

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
    await http().get('/importaciones').expect(401);
    await http().delete(`/importaciones/${A}`).expect(401);
  });

  it('GET lista las importaciones del usuario, la más reciente primero', async () => {
    await importar(authA, 'a.csv', [f('a1'), f('a2')]);
    await importar(authA, 'b.csv', [f('b1')]);
    await importar(authB, 'ajena.csv', [f('x')]);
    const res = await http().get('/importaciones').set(authA).expect(200);
    expect(
      res.body.map((i: { nombreArchivo: string }) => i.nombreArchivo),
    ).toEqual(['b.csv', 'a.csv']);
    expect(res.body[1]).toMatchObject({
      filasImportadas: 2,
      id: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it('GET sin importaciones -> []', async () => {
    const res = await http().get('/importaciones').set(authA).expect(200);
    expect(res.body).toEqual([]);
  });

  it('DELETE tras editar un movimiento borra todo el lote; quedan otros lotes y manuales; la categoría creada sigue', async () => {
    const a = await importar(
      authA,
      'a.csv',
      [f('a1', { categoriaNueva: 'Mascotas' }), f('a2'), f('a3')],
      [{ nombre: 'Mascotas', tipo: 'gasto' }],
    );
    await importar(authA, 'b.csv', [f('b1')]);
    await http()
      .post('/transacciones')
      .set(authA)
      .send({
        tipo: 'gasto',
        monto: '5.00',
        fecha: '2026-11-02',
        descripcion: 'manual',
        categoriaId: null,
      })
      .expect(201);
    const a2 = (await movimientos(authA)).find((m) => m.descripcion === 'a2')!;
    await http()
      .patch(`/transacciones/${a2.id}`)
      .set(authA)
      .send({ descripcion: 'a2 editado', monto: '99.00' })
      .expect(200);

    await http().delete(`/importaciones/${a.id}`).set(authA).expect(204);

    expect((await movimientos(authA)).map((m) => m.descripcion).sort()).toEqual(
      ['b1', 'manual'],
    );
    const cats = (await http().get('/categorias').set(authA).expect(200))
      .body as { nombre: string }[];
    expect(cats.some((c) => c.nombre === 'Mascotas')).toBe(true);
    const lista = (await http().get('/importaciones').set(authA).expect(200))
      .body as { nombreArchivo: string }[];
    expect(lista.map((i) => i.nombreArchivo)).toEqual(['b.csv']);
  });

  it('DELETE de una importación ajena o inexistente -> 404 y no borra nada', async () => {
    const a = await importar(authA, 'a.csv', [f('a1')]);
    await http().delete(`/importaciones/${a.id}`).set(authB).expect(404);
    await http().delete(`/importaciones/${B}`).set(authA).expect(404);
    expect(await movimientos(authA)).toHaveLength(1);
    await http().delete(`/importaciones/${a.id}`).set(authA).expect(204);
    await http().delete(`/importaciones/${a.id}`).set(authA).expect(404);
  });

  it('DELETE con id que no es UUID -> 400', async () => {
    await http().delete('/importaciones/no-uuid').set(authA).expect(400);
  });
});
