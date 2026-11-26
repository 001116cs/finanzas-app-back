import { INestApplication } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import request from 'supertest';
import { RELOJ } from '../src/compartido/reloj.js';
import * as schema from '../src/db/schema.js';
import {
  USO_IA_REPOSITORY,
  type UsoIaRepository,
} from '../src/uso-ia/application/uso-ia.repository.js';
import { crearAppTest } from './helpers/app.js';
import { migrarBdTest, truncarTodo, urlBdTest } from './helpers/db.js';

const A = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';
const B = '7c1d8e2f-3b4a-4c5d-8e6f-1a2b3c4d5e6f';
const authA = { Authorization: `Bearer token-${A}` };
const authB = { Authorization: `Bearer token-${B}` };
const perfil = { moneda: 'PEN', zonaHoraria: 'America/Lima' };
// 2026-12-01 03:00Z = 30 de noviembre 22:00 en Lima (mes usuario 2026-11, UTC 2026-12)
const AHORA = new Date('2026-12-01T03:00:00Z');
const MES = '2026-11';
const MES_UTC = '2026-12';

describe('uso-ia', () => {
  let app: INestApplication;
  const cliente = postgres(urlBdTest(), { max: 1 });
  const db = drizzle(cliente, { schema });
  const http = () => request(app.getHttpServer());

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
    await cliente.end();
  });

  it('sin token -> 401', async () => {
    await http().get('/uso-ia').expect(401);
  });

  it('usuario sin datos -> ceros y límites por defecto', async () => {
    const r = await http().get('/uso-ia').set(authA).expect(200);
    expect(r.body).toEqual({
      mes: MES,
      boletas: { usadas: 0, limite: 20 },
      intentosFallidos: { usados: 0, limite: 10 },
      globalAgotado: false,
    });
  });

  it('aísla el uso entre usuarios', async () => {
    await db
      .insert(schema.aiUsage)
      .values({ userId: A, mes: MES, boletasUsadas: 5 });
    const a = await http().get('/uso-ia').set(authA).expect(200);
    const b = await http().get('/uso-ia').set(authB).expect(200);
    expect(a.body.boletas.usadas).toBe(5);
    expect(b.body.boletas.usadas).toBe(0);
  });

  it('costo global >= presupuesto -> globalAgotado', async () => {
    await db
      .insert(schema.aiGlobalUsage)
      .values({ mes: MES_UTC, costoEstimadoUsd: '10.000000' });
    const r = await http().get('/uso-ia').set(authA).expect(200);
    expect(r.body.globalAgotado).toBe(true);
  });

  describe('repositorio', () => {
    const repo = () => app.get<UsoIaRepository>(USO_IA_REPOSITORY);

    it('reservarBoleta concurrente con límite 1: exactamente una reserva', async () => {
      const r = await Promise.all([
        repo().reservarBoleta(A, MES, 1, 10),
        repo().reservarBoleta(A, MES, 1, 10),
        repo().reservarBoleta(A, MES, 1, 10),
      ]);
      expect(r.filter(Boolean)).toHaveLength(1);
      expect((await repo().obtener(A, MES)).boletasUsadas).toBe(1);
    });

    it('reservarBoleta respeta límite de fallidos y límites en 0', async () => {
      await db
        .insert(schema.aiUsage)
        .values({ userId: A, mes: MES, intentosFallidos: 10 });
      expect(await repo().reservarBoleta(A, MES, 20, 10)).toBe(false);
      expect(await repo().reservarBoleta(B, MES, 0, 10)).toBe(false);
      expect(await repo().reservarBoleta(B, MES, 20, 0)).toBe(false);
      expect((await repo().obtener(B, MES)).boletasUsadas).toBe(0);
    });

    it('confirmarBoleta sólo suma el costo global', async () => {
      await repo().reservarBoleta(A, MES, 20, 10);
      await repo().confirmarBoleta(MES_UTC, 0.25);
      await repo().confirmarBoleta(MES_UTC, 0.5);
      expect((await repo().obtener(A, MES)).boletasUsadas).toBe(1);
      expect(await repo().costoGlobal(MES_UTC)).toBeCloseTo(0.75, 6);
    });

    it('liberarComoFallo deja boletas 0, fallidos 1 y suma costo', async () => {
      await repo().reservarBoleta(A, MES, 20, 10);
      await repo().liberarComoFallo(A, MES, MES_UTC, 0.1);
      expect(await repo().obtener(A, MES)).toEqual({
        boletasUsadas: 0,
        preguntasUsadas: 0,
        intentosFallidos: 1,
      });
      expect(await repo().costoGlobal(MES_UTC)).toBeCloseTo(0.1, 6);
    });

    it('liberar devuelve el cupo y no baja de 0', async () => {
      await repo().reservarBoleta(A, MES, 20, 10);
      await repo().liberar(A, MES);
      await repo().liberar(A, MES);
      expect((await repo().obtener(A, MES)).boletasUsadas).toBe(0);
    });
  });
});
