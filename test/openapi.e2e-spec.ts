import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { construirDocumento } from '../src/compartido/openapi.js';
import { crearAppTest } from './helpers/app.js';

describe('OpenAPI y CORS', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppTest();
  });
  afterAll(async () => {
    await app.close();
  });

  it('el documento contiene las rutas del contrato', () => {
    const doc = construirDocumento(app);
    for (const ruta of [
      '/perfil',
      '/categorias',
      '/categorias/{id}',
      '/transacciones',
      '/transacciones/{id}',
      '/resumen',
    ]) {
      expect(doc.paths).toHaveProperty([ruta]);
    }
  });

  it('monto es string en el esquema de la transacción y categoriaId es nullable', () => {
    const esquemas = construirDocumento(app).components?.schemas as Record<
      string,
      { properties: Record<string, { type?: string; nullable?: boolean }> }
    >;
    const t = esquemas['TransaccionRespuesta'];
    expect(t.properties.monto.type).toBe('string');
    expect(t.properties.categoriaId.nullable).toBe(true);
    expect(t.properties.categoriaNombre.nullable).toBe(true);
    expect(esquemas['ResumenRespuesta'].properties.totalGastos.type).toBe(
      'string',
    );
  });

  it('GET /categorias documenta un arreglo de CategoriaRespuesta', () => {
    const doc = construirDocumento(app);
    const resp = doc.paths['/categorias']?.get?.responses?.['200'] as {
      content: Record<string, { schema: unknown }>;
    };
    expect(resp.content['application/json'].schema).toEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/CategoriaRespuesta' },
    });
  });

  it('ningún $ref del documento está vacío', () => {
    const vacios: string[] = [];
    const recorrer = (nodo: unknown, ruta: string): void => {
      if (Array.isArray(nodo)) {
        nodo.forEach((v, i) => recorrer(v, `${ruta}/${i}`));
      } else if (nodo && typeof nodo === 'object') {
        for (const [k, v] of Object.entries(nodo)) {
          if (k === '$ref' && v === '#/components/schemas/') vacios.push(ruta);
          recorrer(v, `${ruta}/${k}`);
        }
      }
    };
    recorrer(construirDocumento(app), '');
    expect(vacios).toEqual([]);
  });

  it('las rutas protegidas exigen bearer y /health no', () => {
    const doc = construirDocumento(app);
    expect(doc.paths['/perfil']?.get?.security).toEqual([{ bearer: [] }]);
    expect(doc.paths['/health']?.get?.security).toBeUndefined();
  });

  it('preflight desde FRONT_URL recibe Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/perfil')
      .set('Origin', process.env.FRONT_URL!)
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe(
      process.env.FRONT_URL,
    );
  });

  it('preflight desde otro origen no recibe Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/perfil')
      .set('Origin', 'https://malo.example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
