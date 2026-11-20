import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DB } from '../../db/db.module.js';
import * as schema from '../../db/schema.js';
import type { PerfilRepository } from '../application/perfil.repository.js';
import type { CategoriaSugerida, Perfil } from '../domain/perfil.js';

@Injectable()
export class DrizzlePerfilRepository implements PerfilRepository {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async obtener(userId: string): Promise<Perfil | null> {
    const [fila] = await this.db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId));
    return fila
      ? { id: fila.id, moneda: fila.moneda, zonaHoraria: fila.zonaHoraria }
      : null;
  }

  async crearConCategorias(
    perfil: Perfil,
    categorias: readonly CategoriaSugerida[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(schema.profiles).values(perfil);
      await tx
        .insert(schema.categories)
        .values(categorias.map((c) => ({ ...c, userId: perfil.id })));
    });
  }

  async actualizar(perfil: Perfil): Promise<void> {
    await this.db
      .update(schema.profiles)
      .set({ moneda: perfil.moneda, zonaHoraria: perfil.zonaHoraria })
      .where(eq(schema.profiles.id, perfil.id));
  }
}
