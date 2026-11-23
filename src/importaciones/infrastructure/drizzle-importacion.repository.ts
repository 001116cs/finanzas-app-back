import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Monto } from '../../compartido/monto.js';
import { DB } from '../../db/db.module.js';
import * as schema from '../../db/schema.js';
import type {
  FilaClave,
  ImportacionRepository,
} from '../application/importacion.repository.js';
import { claveDuplicado } from '../domain/fila-importada.js';

const { transactions } = schema;

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
}
