import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RELOJ } from '../src/compartido/reloj.js';
import { crearAppTest } from './helpers/app.js';
import { migrarBdTest, truncarTodo } from './helpers/db.js';

const A = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';
const B = '7c1d8e2f-3b4a-4c5d-8e6f-1a2b3c4d5e6f';
const authA = { Authorization: `Bearer token-${A}` };
const authB = { Authorization: `Bearer token-${B}` };

// En Lima (UTC-5) todavía es 30 de noviembre de 2026.
const AHORA = new Date('2026-12-01T03:00:00Z');

describe('resumen', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  async function categoria(auth: Record<string, string>, tipo: string, nombre: string) {
    const lista = await http()
      .get(`/categorias?tipo=${tipo}`)
      .set(auth)
      .expect(200);
    return lista.body.find((x: { nombre: string }) => x.nombre === nombre)
      .id as string;
  }
  const mov = (
    auth: Record<string, string>,
    tipo: string,
    monto: string,
    fecha: string,
    categoriaId: string | null = null,
  ) =>
    http()
      .post('/transacciones')
      .set(auth)
      .send({ tipo, monto, fecha, descripcion: 'x', categoriaId })
      .expect(201);

  beforeAll(async () => {
    await migrarBdTest();
    app = await crearAppTest([], (b) =>
      b.overrideProvider(RELOJ).useValue({ ahora: () => AHORA }),
    );
  });
  beforeEach(async () => {
    await truncarTodo();
    await http()
      .post('/perfil')
      .set(authA)
      .send({ moneda: 'PEN', zonaHoraria: 'America/Lima' })
      .expect(201);
    await http()
      .post('/perfil')
      .set(authB)
      .send({ moneda: 'USD', zonaHoraria: 'UTC' })
      .expect(201);
  });
  afterAll(async () => {
    await app.close();
  });

  it('sin token -> 401', async () => {
    await http().get('/resumen').expect(401);
  });

  it('sin parámetros cuenta sólo el mes actual en la zona del usuario', async () => {
    await mov(authA, 'gasto', '10.00', '2026-11-30');
    await mov(authA, 'gasto', '99.00', '2026-12-01'); // fuera (mes siguiente)
    await mov(authA, 'gasto', '77.00', '2026-10-31'); // fuera
    const res = await http().get('/resumen').set(authA).expect(200);
    expect(res.body).toMatchObject({
      desde: '2026-11-01',
      hasta: '2026-11-30',
      moneda: 'PEN',
      totalGastos: '10.00',
      totalIngresos: '0.00',
      balance: '-10.00',
    });
  });

  it('calcula totales y balance negativo', async () => {
    await mov(authA, 'ingreso', '100.00', '2026-11-05');
    await mov(authA, 'gasto', '70.50', '2026-11-06');
    await mov(authA, 'gasto', '49.50', '2026-11-07');
    const res = await http().get('/resumen').set(authA).expect(200);
    expect(res.body.totalIngresos).toBe('100.00');
    expect(res.body.totalGastos).toBe('120.00');
    expect(res.body.balance).toBe('-20.00');
  });

  it('porCategoria agrupa e incluye Sin categoría', async () => {
    const comida = await categoria(authA, 'gasto', 'Comida');
    await mov(authA, 'gasto', '10.00', '2026-11-05', comida);
    await mov(authA, 'gasto', '5.25', '2026-11-06', comida);
    await mov(authA, 'gasto', '3.00', '2026-11-06');
    await mov(authA, 'ingreso', '8.00', '2026-11-06');
    const res = await http().get('/resumen').set(authA).expect(200);
    expect(res.body.porCategoria).toHaveLength(3);
    expect(res.body.porCategoria).toEqual(
      expect.arrayContaining([
        {
          categoriaId: comida,
          nombre: 'Comida',
          tipo: 'gasto',
          total: '15.25',
        },
        {
          categoriaId: null,
          nombre: 'Sin categoría',
          tipo: 'gasto',
          total: '3.00',
        },
        {
          categoriaId: null,
          nombre: 'Sin categoría',
          tipo: 'ingreso',
          total: '8.00',
        },
      ]),
    );
  });

  it('respeta desde/hasta explícitos (inclusivos)', async () => {
    await mov(authA, 'gasto', '1.00', '2026-10-31');
    await mov(authA, 'gasto', '2.00', '2026-11-01');
    await mov(authA, 'gasto', '4.00', '2026-11-02');
    await mov(authA, 'gasto', '8.00', '2026-11-03');
    const res = await http()
      .get('/resumen?desde=2026-11-01&hasta=2026-11-02')
      .set(authA)
      .expect(200);
    expect(res.body.desde).toBe('2026-11-01');
    expect(res.body.hasta).toBe('2026-11-02');
    expect(res.body.totalGastos).toBe('6.00');
  });

  it('desde > hasta -> 400 RANGO_INVALIDO', async () => {
    const res = await http()
      .get('/resumen?desde=2026-11-10&hasta=2026-11-01')
      .set(authA)
      .expect(400);
    expect(res.body.codigo ?? res.body.code).toBe('RANGO_INVALIDO');
  });

  it('sólo uno de los dos -> 400 RANGO_INVALIDO', async () => {
    await http().get('/resumen?desde=2026-11-01').set(authA).expect(400);
    await http().get('/resumen?hasta=2026-11-01').set(authA).expect(400);
  });

  it('fecha inválida -> 400', async () => {
    await http()
      .get('/resumen?desde=2026-13-01&hasta=2026-13-02')
      .set(authA)
      .expect(400);
    await http()
      .get('/resumen?desde=hola&hasta=2026-11-02')
      .set(authA)
      .expect(400);
  });

  it('no suma datos de otro usuario y usa su propia moneda', async () => {
    await mov(authB, 'gasto', '500.00', '2026-12-01');
    await mov(authA, 'gasto', '1.00', '2026-11-10');
    const a = await http().get('/resumen').set(authA).expect(200);
    expect(a.body.totalGastos).toBe('1.00');
    const b = await http().get('/resumen').set(authB).expect(200);
    expect(b.body.moneda).toBe('USD');
    expect(b.body.desde).toBe('2026-12-01');
    expect(b.body.totalGastos).toBe('500.00');
  });
});
