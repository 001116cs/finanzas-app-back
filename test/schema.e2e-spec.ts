import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import { migrarBdTest, truncarTodo, urlBdTest } from './helpers/db.js';

describe('schema', () => {
  const cliente = postgres(urlBdTest(), { max: 1 });
  const db = drizzle(cliente, { schema });
  const userId = '11111111-1111-4111-8111-111111111111';

  beforeAll(async () => {
    await migrarBdTest();
  });
  beforeEach(async () => {
    await truncarTodo();
  });
  afterAll(async () => {
    await cliente.end();
  });

  it('rechaza categorías con el mismo nombre (sin importar mayúsculas), usuario y tipo', async () => {
    await db
      .insert(schema.categories)
      .values({ userId, nombre: 'Comida', tipo: 'gasto' });
    const error = await db
      .insert(schema.categories)
      .values({ userId, nombre: 'comida', tipo: 'gasto' })
      .then(
        () => undefined,
        (e: { cause?: { code?: string; constraint_name?: string } }) => e,
      );
    // drizzle envuelve el error de postgres en `cause`
    expect(error?.cause?.code).toBe('23505');
    expect(error?.cause?.constraint_name).toBe('categories_user_tipo_nombre_uq');
  });

  it('permite el mismo nombre con distinto tipo', async () => {
    await db
      .insert(schema.categories)
      .values({ userId, nombre: 'Otros', tipo: 'gasto' });
    await expect(
      db
        .insert(schema.categories)
        .values({ userId, nombre: 'otros', tipo: 'ingreso' }),
    ).resolves.toBeDefined();
  });

  it('deja category_id en null al borrar la categoría', async () => {
    const [cat] = await db
      .insert(schema.categories)
      .values({ userId, nombre: 'Comida', tipo: 'gasto' })
      .returning();
    const [tx] = await db
      .insert(schema.transactions)
      .values({
        userId,
        tipo: 'gasto',
        monto: '10.00',
        fecha: '2026-11-01',
        descripcion: 'Almuerzo',
        categoryId: cat.id,
      })
      .returning();
    await db.delete(schema.categories);
    const filas = await db.select().from(schema.transactions);
    expect(filas).toHaveLength(1);
    expect(filas[0].id).toBe(tx.id);
    expect(filas[0].categoryId).toBeNull();
  });

  it('borrar un import borra sus transacciones y deja las demás', async () => {
    const [imp] = await db
      .insert(schema.imports)
      .values({ userId, nombreArchivo: 'a.csv', filasImportadas: 1 })
      .returning();
    const comun = {
      userId,
      tipo: 'gasto' as const,
      monto: '10.00',
      fecha: '2026-11-01',
    };
    await db.insert(schema.transactions).values([
      { ...comun, descripcion: 'importada', importId: imp.id, origen: 'excel' },
      { ...comun, descripcion: 'manual' },
    ]);
    await db.delete(schema.imports);
    const filas = await db.select().from(schema.transactions);
    expect(filas.map((f) => f.descripcion)).toEqual(['manual']);
  });

  it('borrar un receipt deja receipt_id en null y conserva sus transacciones', async () => {
    const [rec] = await db
      .insert(schema.receipts)
      .values({
        userId,
        rutaImagen: 'u/b.jpg',
        comercio: 'Tienda',
        fecha: '2026-11-01',
      })
      .returning();
    const [tx] = await db
      .insert(schema.transactions)
      .values({
        userId,
        tipo: 'gasto',
        monto: '10.00',
        fecha: '2026-11-01',
        descripcion: 'Compra',
        origen: 'boleta',
        receiptId: rec.id,
      })
      .returning();
    expect(tx.receiptId).toBe(rec.id);
    await db.delete(schema.receipts);
    const filas = await db.select().from(schema.transactions);
    expect(filas).toHaveLength(1);
    expect(filas[0].id).toBe(tx.id);
    expect(filas[0].receiptId).toBeNull();
  });

  it('rechaza dos ai_usage con el mismo (user_id, mes)', async () => {
    await db.insert(schema.aiUsage).values({ userId, mes: '2026-11' });
    const error = await db
      .insert(schema.aiUsage)
      .values({ userId, mes: '2026-11' })
      .then(
        () => undefined,
        (e: { cause?: { code?: string } }) => e,
      );
    expect(error?.cause?.code).toBe('23505');
  });

  it('ai_usage inicia sus contadores en 0', async () => {
    const [fila] = await db
      .insert(schema.aiUsage)
      .values({ userId, mes: '2026-11' })
      .returning();
    expect(fila.boletasUsadas).toBe(0);
    expect(fila.preguntasUsadas).toBe(0);
    expect(fila.intentosFallidos).toBe(0);
  });
});
