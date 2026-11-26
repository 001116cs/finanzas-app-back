import { INestApplication } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import postgres from 'postgres';
import request from 'supertest';
import { LECTOR_DE_BOLETAS } from '../src/boletas/application/lector-de-boletas.js';
import type {
  LectorDeBoletas,
  ResultadoLectura,
} from '../src/boletas/application/lector-de-boletas.js';
import { LectorFalso } from '../src/boletas/infrastructure/lector-falso.js';
import { IaNoDisponibleError } from '../src/compartido/errores.js';
import { RELOJ } from '../src/compartido/reloj.js';
import * as schema from '../src/db/schema.js';
import { crearAppTest } from './helpers/app.js';
import { migrarBdTest, truncarTodo, urlBdTest } from './helpers/db.js';

const A = '0b9f2c1e-6a3d-4d58-9a43-6d2f6f1d0a11';
const B = '7c1d8e2f-3b4a-4c5d-8e6f-1a2b3c4d5e6f';
const authA = { Authorization: `Bearer token-${A}` };
const authB = { Authorization: `Bearer token-${B}` };
const perfil = { moneda: 'PEN', zonaHoraria: 'America/Lima' };
const AHORA = new Date('2026-11-22T03:00:00Z'); // mes usuario 2026-11
const MES = '2026-11';

const JPG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('relleno-de-prueba-boleta'),
]);
const USO = {
  modelo: 'claude-sonnet-5-5',
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
};

class LectorConfigurable implements LectorDeBoletas {
  llamadas = 0;
  modo: 'ok' | 'ilegible' | 'ia-caida' = 'ok';
  private readonly falso = new LectorFalso();
  async leer(
    imagen: Parameters<LectorDeBoletas['leer']>[0],
    categorias: string[],
  ): Promise<ResultadoLectura> {
    this.llamadas++;
    if (this.modo === 'ilegible') return { tipo: 'ilegible', uso: USO };
    if (this.modo === 'ia-caida') throw new IaNoDisponibleError();
    return this.falso.leer(imagen, categorias);
  }
}

describe('boletas', () => {
  let app: INestApplication;
  let dir: string;
  const lector = new LectorConfigurable();
  const cliente = postgres(urlBdTest(), { max: 1 });
  const db = drizzle(cliente, { schema });
  const http = () => request(app.getHttpServer());

  const archivos = async () => (await readdir(dir, { recursive: true })).length;
  const ficheros = async () =>
    (await readdir(dir, { recursive: true, withFileTypes: true })).filter((e) =>
      e.isFile(),
    ).length;
  const escanear = (auth: Record<string, string>, buf: Buffer = JPG) =>
    http()
      .post('/boletas/escanear')
      .set(auth)
      .attach('imagen', buf, { filename: 'b.jpg', contentType: 'image/jpeg' });
  const datos = (over: object = {}) => ({
    comercio: 'Bodega Demo',
    fecha: '2026-11-20',
    totalImpreso: '8.40',
    productos: [
      { descripcion: 'Leche', monto: '4.50', categoriaId: null },
      { descripcion: 'Pan', monto: '3.90', categoriaId: null },
    ],
    ...over,
  });
  const guardar = (auth: Record<string, string>, d: unknown = datos()) =>
    http()
      .post('/boletas')
      .set(auth)
      .attach('imagen', JPG, { filename: 'b.jpg', contentType: 'image/jpeg' })
      .field('datos', typeof d === 'string' ? d : JSON.stringify(d));
  const categoriaId = async (auth: Record<string, string>, nombre: string) => {
    const l = await http().get('/categorias?tipo=gasto').set(auth).expect(200);
    return l.body.find((c: { nombre: string }) => c.nombre === nombre)
      .id as string;
  };
  const uso = async (auth: Record<string, string>) =>
    (await http().get('/uso-ia').set(auth).expect(200)).body;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'boletas-e2e-'));
    process.env.STORAGE_LOCAL_DIR = dir;
    await migrarBdTest();
    app = await crearAppTest([], (b) =>
      b
        .overrideProvider(LECTOR_DE_BOLETAS)
        .useValue(lector)
        .overrideProvider(RELOJ)
        .useValue({ ahora: () => AHORA }),
    );
  });
  beforeEach(async () => {
    await truncarTodo();
    lector.llamadas = 0;
    lector.modo = 'ok';
    await http().post('/perfil').set(authA).send(perfil).expect(201);
    await http().post('/perfil').set(authB).send(perfil).expect(201);
  });
  afterAll(async () => {
    await app.close();
    await cliente.end();
    await rm(dir, { recursive: true, force: true });
  });

  it('sin token -> 401', async () => {
    await http().post('/boletas/escanear').expect(401);
    await http().post('/boletas').expect(401);
    await http().get(`/boletas/${A}`).expect(401);
    await http().get(`/boletas/${A}/imagen`).expect(401);
    await http().delete(`/boletas/${A}`).expect(401);
  });

  describe('escanear', () => {
    it('lee con el lector falso, mapea categorías y cuenta el uso', async () => {
      const comida = await categoriaId(authA, 'Comida');
      const hogar = await categoriaId(authA, 'Hogar');
      const r = await escanear(authA).expect(200);
      expect(r.body).toEqual({
        comercio: 'Supermercado Demo',
        fecha: '2026-11-20',
        totalImpreso: '23.40',
        productos: [
          { descripcion: 'Leche', monto: '4.50', categoriaId: comida },
          { descripcion: 'Pan', monto: '3.90', categoriaId: comida },
          { descripcion: 'Detergente', monto: '15.00', categoriaId: hogar },
        ],
      });
      expect((await uso(authA)).boletas.usadas).toBe(1);
    });

    it('categoriaId null si el usuario no tiene esas categorías', async () => {
      await db
        .delete(schema.categories)
        .where(
          and(
            eq(schema.categories.userId, B),
            inArray(schema.categories.nombre, ['Comida', 'Hogar']),
          ),
        );
      const r = await escanear(authB).expect(200);
      expect(
        r.body.productos.map((p: { categoriaId: unknown }) => p.categoriaId),
      ).toEqual([null, null, null]);
    });

    it('cupo agotado -> 409 LIMITE_BOLETAS sin llamar al lector', async () => {
      await db
        .insert(schema.aiUsage)
        .values({ userId: A, mes: MES, boletasUsadas: 20 });
      const r = await escanear(authA).expect(409);
      expect(r.body.codigo).toBe('LIMITE_BOLETAS');
      expect(lector.llamadas).toBe(0);
    });

    it('ilegible -> 422 BOLETA_ILEGIBLE; cuenta como intento fallido', async () => {
      lector.modo = 'ilegible';
      const r = await escanear(authA).expect(422);
      expect(r.body.codigo).toBe('BOLETA_ILEGIBLE');
      const u = await uso(authA);
      expect(u.boletas.usadas).toBe(0);
      expect(u.intentosFallidos.usados).toBe(1);
    });

    it('IA caída -> 503 IA_NO_DISPONIBLE y no registra nada', async () => {
      lector.modo = 'ia-caida';
      const r = await escanear(authA).expect(503);
      expect(r.body.codigo).toBe('IA_NO_DISPONIBLE');
      const u = await uso(authA);
      expect(u.boletas.usadas).toBe(0);
      expect(u.intentosFallidos.usados).toBe(0);
    });

    it('texto plano con nombre .jpg -> 400 IMAGEN_INVALIDA', async () => {
      const r = await escanear(
        authA,
        Buffer.from('hola, no soy una imagen'),
      ).expect(400);
      expect(r.body.codigo).toBe('IMAGEN_INVALIDA');
      expect(lector.llamadas).toBe(0);
    });

    it('sin archivo -> 400 IMAGEN_INVALIDA', async () => {
      const r = await http().post('/boletas/escanear').set(authA).expect(400);
      expect(r.body.codigo).toBe('IMAGEN_INVALIDA');
    });

    it('imagen de más de 5 MB -> 400 IMAGEN_INVALIDA', async () => {
      const grande = Buffer.concat([JPG, Buffer.alloc(5 * 1024 * 1024 + 1)]);
      const r = await escanear(authA, grande).expect(400);
      expect(r.body).toEqual({
        codigo: 'IMAGEN_INVALIDA',
        mensaje: 'La imagen supera los 5 MB',
      });
    });
  });

  describe('guardar / obtener / eliminar', () => {
    it('guarda, crea gastos enlazados y sirve la imagen', async () => {
      const comida = await categoriaId(authA, 'Comida');
      const d = datos({
        productos: [
          { descripcion: 'Leche', monto: '4.50', categoriaId: comida },
          { descripcion: 'Pan', monto: '3.90', categoriaId: null },
        ],
      });
      const r = await guardar(authA, d).expect(201);
      expect(r.body).toEqual({ id: expect.any(String), gastosCreados: 2 });
      const id = r.body.id as string;

      const lista = await http().get('/transacciones').set(authA).expect(200);
      expect(lista.body.total).toBe(2);
      for (const t of lista.body.items) {
        expect(t.origen).toBe('boleta');
        expect(t.tipo).toBe('gasto');
        expect(t.fecha).toBe('2026-11-20');
        expect(t.boletaId).toBe(id);
      }

      const b = await http().get(`/boletas/${id}`).set(authA).expect(200);
      expect(b.body).toEqual({
        id,
        comercio: 'Bodega Demo',
        fecha: '2026-11-20',
        totalImpreso: '8.40',
        createdAt: expect.any(String),
      });

      const img = await http()
        .get(`/boletas/${id}/imagen`)
        .set(authA)
        .buffer(true)
        .parse((res, cb) => {
          const trozos: Buffer[] = [];
          res.on('data', (c: Buffer) => trozos.push(c));
          res.on('end', () => cb(null, Buffer.concat(trozos)));
        })
        .expect(200);
      expect(img.headers['content-type']).toContain('image/jpeg');
      expect(img.headers['cache-control']).toBe('private, no-store');
      expect(Buffer.compare(img.body as Buffer, JPG)).toBe(0);
    });

    it('categoría ajena -> 400; no se crea boleta ni archivo', async () => {
      const ajena = await categoriaId(authB, 'Comida');
      const antes = await archivos();
      await guardar(
        authA,
        datos({
          productos: [
            { descripcion: 'Leche', monto: '4.50', categoriaId: ajena },
          ],
        }),
      ).expect(400);
      expect(await db.select().from(schema.receipts)).toHaveLength(0);
      expect(await archivos()).toBe(antes);
    });

    it('datos no JSON -> 400', async () => {
      const r = await guardar(authA, 'esto no es json').expect(400);
      expect(r.body.codigo).toBe('VALIDACION');
    });

    it('datos con forma inválida -> 400', async () => {
      await guardar(authA, { comercio: 'x' }).expect(400);
      await guardar(authA, datos({ extra: 1 })).expect(400);
    });

    it('otro usuario -> 404 en GET, imagen y DELETE', async () => {
      const { id } = (await guardar(authA).expect(201)).body;
      await http().get(`/boletas/${id}`).set(authB).expect(404);
      await http().get(`/boletas/${id}/imagen`).set(authB).expect(404);
      await http().delete(`/boletas/${id}`).set(authB).expect(404);
      await http().get(`/boletas/${id}`).set(authA).expect(200);
    });

    it('DELETE -> 204; gastos con boletaId null; archivo borrado; repetir -> 404', async () => {
      const { id } = (await guardar(authA).expect(201)).body;
      const antes = await ficheros();
      await http().delete(`/boletas/${id}`).set(authA).expect(204);
      const lista = await http().get('/transacciones').set(authA).expect(200);
      expect(lista.body.total).toBe(2);
      for (const t of lista.body.items) {
        expect(t.boletaId).toBeNull();
        expect(t.origen).toBe('boleta');
      }
      expect(await ficheros()).toBe(antes - 2); // imagen + .meta.json;
      await http().delete(`/boletas/${id}`).set(authA).expect(404);
    });
  });
});
