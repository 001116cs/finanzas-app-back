import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, isNull, lte, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Monto } from '../../compartido/monto.js';
import { DB } from '../../db/db.module.js';
import * as schema from '../../db/schema.js';
import type {
  DatosTransaccion,
  FiltrosTransaccion,
  TransaccionRepository,
} from '../application/transaccion.repository.js';
import type { Transaccion } from '../domain/transaccion.js';

const { transactions, categories } = schema;

const columnas = {
  id: transactions.id,
  tipo: transactions.tipo,
  monto: transactions.monto,
  fecha: transactions.fecha,
  descripcion: transactions.descripcion,
  categoriaId: transactions.categoryId,
  categoriaNombre: categories.nombre,
  origen: transactions.origen,
  createdAt: transactions.createdAt,
};

type Fila = {
  id: string;
  tipo: 'gasto' | 'ingreso';
  monto: string;
  fecha: string;
  descripcion: string;
  categoriaId: string | null;
  categoriaNombre: string | null;
  origen: 'manual' | 'excel' | 'boleta';
  createdAt: Date;
};

/** numeric(12,2) llega como string "12.50"; el dominio usa centavos. */
function aDominio(f: Fila): Transaccion {
  return { ...f, monto: Monto.desdeTexto(f.monto) };
}

@Injectable()
export class DrizzleTransaccionRepository implements TransaccionRepository {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private seleccionar(where: SQL | undefined) {
    return this.db
      .select(columnas)
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where);
  }

  async crear(userId: string, d: DatosTransaccion): Promise<Transaccion> {
    const [{ id }] = await this.db
      .insert(transactions)
      .values({
        userId,
        tipo: d.tipo,
        monto: d.monto.aTexto(),
        fecha: d.fecha,
        descripcion: d.descripcion,
        categoryId: d.categoriaId,
        origen: 'manual',
      })
      .returning({ id: transactions.id });
    return (await this.obtener(userId, id))!;
  }

  async obtener(userId: string, id: string): Promise<Transaccion | null> {
    const [fila] = await this.seleccionar(
      and(eq(transactions.id, id), eq(transactions.userId, userId)),
    );
    return fila ? aDominio(fila) : null;
  }

  async actualizar(
    userId: string,
    id: string,
    c: Partial<DatosTransaccion>,
  ): Promise<Transaccion | null> {
    const set: Partial<typeof transactions.$inferInsert> = {};
    if (c.tipo !== undefined) set.tipo = c.tipo;
    if (c.monto !== undefined) set.monto = c.monto.aTexto();
    if (c.fecha !== undefined) set.fecha = c.fecha;
    if (c.descripcion !== undefined) set.descripcion = c.descripcion;
    if (c.categoriaId !== undefined) set.categoryId = c.categoriaId;
    if (Object.keys(set).length > 0) {
      const filas = await this.db
        .update(transactions)
        .set(set)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning({ id: transactions.id });
      if (filas.length === 0) return null;
    }
    return this.obtener(userId, id);
  }

  async eliminar(userId: string, id: string): Promise<boolean> {
    const filas = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });
    return filas.length > 0;
  }

  async listar(userId: string, f: FiltrosTransaccion) {
    const where = and(
      eq(transactions.userId, userId),
      f.desde ? gte(transactions.fecha, f.desde) : undefined,
      f.hasta ? lte(transactions.fecha, f.hasta) : undefined,
      f.tipo ? eq(transactions.tipo, f.tipo) : undefined,
      f.categoriaId === 'sin'
        ? isNull(transactions.categoryId)
        : f.categoriaId
          ? eq(transactions.categoryId, f.categoriaId)
          : undefined,
    );
    const filas = await this.seleccionar(where)
      .orderBy(
        desc(transactions.fecha),
        desc(transactions.createdAt),
        desc(transactions.id),
      )
      .limit(f.tamano)
      .offset((f.pagina - 1) * f.tamano);
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(transactions)
      .where(where);
    return { items: filas.map(aDominio), total: n };
  }
}
