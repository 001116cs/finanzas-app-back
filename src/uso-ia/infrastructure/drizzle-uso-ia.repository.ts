import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lt, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DB } from '../../db/db.module.js';
import * as schema from '../../db/schema.js';
import type {
  UsoIaRepository,
  UsoMensual,
} from '../application/uso-ia.repository.js';

const { aiUsage, aiGlobalUsage } = schema;

@Injectable()
export class DrizzleUsoIaRepository implements UsoIaRepository {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async obtener(userId: string, mes: string): Promise<UsoMensual> {
    const [fila] = await this.db
      .select({
        boletasUsadas: aiUsage.boletasUsadas,
        preguntasUsadas: aiUsage.preguntasUsadas,
        intentosFallidos: aiUsage.intentosFallidos,
      })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.mes, mes)));
    return (
      fila ?? { boletasUsadas: 0, preguntasUsadas: 0, intentosFallidos: 0 }
    );
  }

  async costoGlobal(mes: string): Promise<number> {
    const [fila] = await this.db
      .select({ costo: aiGlobalUsage.costoEstimadoUsd })
      .from(aiGlobalUsage)
      .where(eq(aiGlobalUsage.mes, mes));
    return fila ? Number(fila.costo) : 0;
  }

  async reservarBoleta(
    userId: string,
    mes: string,
    limiteBoletas: number,
    limiteFallidos: number,
  ): Promise<boolean> {
    if (limiteBoletas <= 0 || limiteFallidos <= 0) return false;
    const filas = await this.db
      .insert(aiUsage)
      .values({ userId, mes, boletasUsadas: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.mes],
        set: { boletasUsadas: sql`${aiUsage.boletasUsadas} + 1` },
        setWhere: and(
          lt(aiUsage.boletasUsadas, limiteBoletas),
          lt(aiUsage.intentosFallidos, limiteFallidos),
        ),
      })
      .returning({ userId: aiUsage.userId });
    return filas.length > 0;
  }

  async confirmarBoleta(mesGlobal: string, costoUsd: number): Promise<void> {
    await this.sumarGlobal(this.db, mesGlobal, costoUsd);
  }

  async liberarComoFallo(
    userId: string,
    mes: string,
    mesGlobal: string,
    costoUsd: number,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(aiUsage)
        .set({
          boletasUsadas: sql`greatest(${aiUsage.boletasUsadas} - 1, 0)`,
          intentosFallidos: sql`${aiUsage.intentosFallidos} + 1`,
        })
        .where(and(eq(aiUsage.userId, userId), eq(aiUsage.mes, mes)));
      await this.sumarGlobal(tx, mesGlobal, costoUsd);
    });
  }

  async liberar(userId: string, mes: string): Promise<void> {
    await this.db
      .update(aiUsage)
      .set({ boletasUsadas: sql`greatest(${aiUsage.boletasUsadas} - 1, 0)` })
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.mes, mes)));
  }

  private async sumarGlobal(
    ejecutor: Pick<PostgresJsDatabase<typeof schema>, 'insert'>,
    mesGlobal: string,
    costoUsd: number,
  ): Promise<void> {
    await ejecutor
      .insert(aiGlobalUsage)
      .values({ mes: mesGlobal, costoEstimadoUsd: costoUsd.toFixed(6) })
      .onConflictDoUpdate({
        target: aiGlobalUsage.mes,
        set: {
          costoEstimadoUsd: sql`${aiGlobalUsage.costoEstimadoUsd} + excluded.costo_estimado_usd`,
        },
      });
  }
}
