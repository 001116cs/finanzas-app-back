import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DB } from '../../db/db.module.js';
import * as schema from '../../db/schema.js';
import type {
  Boleta,
  BoletaRepository,
} from '../application/boleta.repository.js';

const { receipts, transactions } = schema;

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
}
