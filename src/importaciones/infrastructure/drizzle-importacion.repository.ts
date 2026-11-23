import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Monto } from '../../compartido/monto.js';
import { DB } from '../../db/db.module.js';
import * as schema from '../../db/schema.js';
import type {
  FilaClave,
  Importacion,
  ImportacionRepository,
} from '../application/importacion.repository.js';
import {
  claveCategoriaNueva,
  claveDuplicado,
} from '../domain/fila-importada.js';

const { transactions, categories, imports } = schema;

@Injectable()
export class DrizzleImportacionRepository implements ImportacionRepository {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async clavesExistentes(
    userId: string,
    filas: FilaClave[],
  ): Promise<Set<string>> {
    const fechas = [...new Set(filas.map((f) => f.fecha))];
    if (fechas.length === 0) return new Set();
    // Una consulta por lote (índice user_id, fecha); la comparación fina va en memoria.
    const rows = await this.db
      .select({
        fecha: transactions.fecha,
        monto: transactions.monto,
        tipo: transactions.tipo,
        descripcion: transactions.descripcion,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.fecha, fechas),
        ),
      );
    return new Set(
      rows.map((r) =>
        claveDuplicado({ ...r, monto: Monto.desdeTexto(r.monto) }),
      ),
    );
  }

  async guardar(
    userId: string,
    datos: Parameters<ImportacionRepository['guardar']>[1],
  ): Promise<Importacion> {
    return this.db.transaction(async (tx) => {
      const ids = new Map<string, string>();
      for (const c of datos.categoriasNuevas) {
        // El índice único (user, tipo, lower(nombre)) es el respaldo ante carreras.
        await tx
          .insert(categories)
          .values({ userId, nombre: c.nombre, tipo: c.tipo })
          .onConflictDoNothing();
        const [fila] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.userId, userId),
              eq(categories.tipo, c.tipo),
              sql`lower(${categories.nombre}) = lower(${c.nombre})`,
            ),
          );
        ids.set(claveCategoriaNueva(c.tipo, c.nombre), fila.id);
      }
      const [imp] = await tx
        .insert(imports)
        .values({
          userId,
          nombreArchivo: datos.nombreArchivo,
          filasImportadas: datos.filas.length,
        })
        .returning();
      await tx.insert(transactions).values(
        datos.filas.map((f) => ({
          userId,
          tipo: f.tipo,
          monto: f.monto.aTexto(),
          fecha: f.fecha,
          descripcion: f.descripcion,
          categoryId:
            f.categoriaNueva !== null
              ? ids.get(claveCategoriaNueva(f.tipo, f.categoriaNueva))!
              : f.categoriaId,
          origen: 'excel' as const,
          importId: imp.id,
        })),
      );
      return {
        id: imp.id,
        nombreArchivo: imp.nombreArchivo,
        filasImportadas: imp.filasImportadas,
        createdAt: imp.createdAt,
      };
    });
  }

  async listar(userId: string): Promise<Importacion[]> {
    return this.db
      .select({
        id: imports.id,
        nombreArchivo: imports.nombreArchivo,
        filasImportadas: imports.filasImportadas,
        createdAt: imports.createdAt,
      })
      .from(imports)
      .where(eq(imports.userId, userId))
      .orderBy(desc(imports.createdAt), desc(imports.id));
  }

  async eliminar(userId: string, id: string): Promise<boolean> {
    const borradas = await this.db
      .delete(imports)
      .where(and(eq(imports.id, id), eq(imports.userId, userId)))
      .returning({ id: imports.id });
    return borradas.length > 0;
  }
}
