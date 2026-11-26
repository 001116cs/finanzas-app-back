import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Monto } from '../../compartido/monto.js';
import { DB } from '../../db/db.module.js';
import * as schema from '../../db/schema.js';
import type {
  Boleta,
  BoletaRepository,
  CambiosBoleta,
  GastoDeBoleta,
  ResumenBoleta,
} from '../application/boleta.repository.js';
import type { Transaccion } from '../../transacciones/domain/transaccion.js';

const { receipts, transactions, categories } = schema;

const columnasGasto = {
  id: transactions.id,
  tipo: transactions.tipo,
  monto: transactions.monto,
  fecha: transactions.fecha,
  descripcion: transactions.descripcion,
  categoriaId: transactions.categoryId,
  categoriaNombre: categories.nombre,
  origen: transactions.origen,
  boletaId: transactions.receiptId,
  createdAt: transactions.createdAt,
};

@Injectable()
export class DrizzleBoletaRepository implements BoletaRepository {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async crearConGastos(
    userId: string,
    datos: Parameters<BoletaRepository['crearConGastos']>[1],
  ): Promise<{ id: string; gastosCreados: number }> {
    return this.db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(receipts)
        .values({
          userId,
          rutaImagen: datos.rutaImagen,
          comercio: datos.comercio,
          fecha: datos.fecha,
          totalImpreso: datos.totalImpreso?.aTexto() ?? null,
        })
        .returning({ id: receipts.id });
      if (datos.gastos.length > 0) {
        await tx.insert(transactions).values(
          datos.gastos.map((g) => ({
            userId,
            tipo: 'gasto' as const,
            monto: g.monto.aTexto(),
            fecha: datos.fecha,
            descripcion: g.descripcion,
            categoryId: g.categoriaId,
            origen: 'boleta' as const,
            receiptId: id,
          })),
        );
      }
      return { id, gastosCreados: datos.gastos.length };
    });
  }

  async obtener(userId: string, id: string): Promise<Boleta | null> {
    const [fila] = await this.db
      .select({
        id: receipts.id,
        comercio: receipts.comercio,
        fecha: receipts.fecha,
        totalImpreso: receipts.totalImpreso,
        rutaImagen: receipts.rutaImagen,
        createdAt: receipts.createdAt,
      })
      .from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
    return fila ?? null;
  }

  async eliminar(userId: string, id: string): Promise<string | null> {
    const [fila] = await this.db
      .delete(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
      .returning({ rutaImagen: receipts.rutaImagen });
    return fila?.rutaImagen ?? null;
  }

  async eliminarConGastos(userId: string, id: string): Promise<string | null> {
    return this.db.transaction(async (tx) => {
      const [boleta] = await tx
        .select({ id: receipts.id })
        .from(receipts)
        .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
        .for('update');
      if (!boleta) return null;
      await tx
        .delete(transactions)
        .where(
          and(eq(transactions.receiptId, id), eq(transactions.userId, userId)),
        );
      const [fila] = await tx
        .delete(receipts)
        .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
        .returning({ rutaImagen: receipts.rutaImagen });
      return fila?.rutaImagen ?? null;
    });
  }

  async listar(
    userId: string,
    pagina: number,
    tamano: number,
  ): Promise<{ items: ResumenBoleta[]; total: number }> {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(receipts)
      .where(eq(receipts.userId, userId));
    const items = await this.db
      .select({
        id: receipts.id,
        comercio: receipts.comercio,
        fecha: receipts.fecha,
        totalImpreso: receipts.totalImpreso,
        gastos: sql<number>`count(${transactions.id})::int`,
        sumaGastos: sql<string>`coalesce(sum(${transactions.monto}), 0)::numeric(14,2)::text`,
        createdAt: receipts.createdAt,
      })
      .from(receipts)
      .leftJoin(
        transactions,
        and(
          eq(transactions.receiptId, receipts.id),
          eq(transactions.userId, userId),
        ),
      )
      .where(eq(receipts.userId, userId))
      .groupBy(receipts.id)
      .orderBy(desc(receipts.fecha), desc(receipts.createdAt), asc(receipts.id))
      .limit(tamano)
      .offset((pagina - 1) * tamano);
    return { items, total };
  }

  async gastosDe(userId: string, id: string): Promise<Transaccion[]> {
    const filas = await this.db
      .select(columnasGasto)
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(eq(transactions.receiptId, id), eq(transactions.userId, userId)),
      )
      .orderBy(asc(transactions.createdAt), asc(transactions.id));
    return filas.map((f) => ({ ...f, monto: Monto.desdeTexto(f.monto) }));
  }

  async actualizarCabecera(
    userId: string,
    id: string,
    cambios: CambiosBoleta,
  ): Promise<boolean> {
    const set: Partial<typeof receipts.$inferInsert> = {};
    if (cambios.comercio !== undefined) set.comercio = cambios.comercio;
    if (cambios.fecha !== undefined) set.fecha = cambios.fecha;
    if (cambios.totalImpreso !== undefined)
      set.totalImpreso = cambios.totalImpreso?.aTexto() ?? null;
    return this.db.transaction(async (tx) => {
      const filas = await tx
        .update(receipts)
        .set(set)
        .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
        .returning({ id: receipts.id });
      if (filas.length === 0) return false;
      if (cambios.fecha !== undefined)
        await tx
          .update(transactions)
          .set({ fecha: cambios.fecha })
          .where(
            and(
              eq(transactions.receiptId, id),
              eq(transactions.userId, userId),
            ),
          );
      return true;
    });
  }

  async agregarGasto(
    userId: string,
    id: string,
    gasto: GastoDeBoleta,
  ): Promise<Transaccion | null> {
    return this.db.transaction(async (tx) => {
      const [boleta] = await tx
        .select({ fecha: receipts.fecha })
        .from(receipts)
        .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
        .for('update');
      if (!boleta) return null;
      const [{ id: nuevo }] = await tx
        .insert(transactions)
        .values({
          userId,
          tipo: 'gasto',
          monto: gasto.monto.aTexto(),
          fecha: boleta.fecha,
          descripcion: gasto.descripcion,
          categoryId: gasto.categoriaId,
          origen: 'boleta',
          receiptId: id,
        })
        .returning({ id: transactions.id });
      const [fila] = await tx
        .select(columnasGasto)
        .from(transactions)
        .leftJoin(categories, eq(categories.id, transactions.categoryId))
        .where(eq(transactions.id, nuevo));
      return { ...fila, monto: Monto.desdeTexto(fila.monto) };
    });
  }
}
