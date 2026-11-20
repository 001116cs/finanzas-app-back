import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  ConflictoError,
  NoEncontradoError,
  ValidacionError,
} from '../../compartido/errores.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import { DB } from '../../db/db.module.js';
import * as schema from '../../db/schema.js';
import type {
  CategoriaRepository,
  ModoEliminacion,
} from '../application/categoria.repository.js';
import type { Categoria, CategoriaConConteo } from '../domain/categoria.js';

const { categories, transactions } = schema;

function esViolacionUnica(e: unknown): boolean {
  // Drizzle puede envolver el error de postgres-js en `cause`.
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
}

@Injectable()
export class DrizzleCategoriaRepository implements CategoriaRepository {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listar(
    userId: string,
    tipo?: TipoMovimiento,
  ): Promise<CategoriaConConteo[]> {
    return this.db
      .select({
        id: categories.id,
        nombre: categories.nombre,
        tipo: categories.tipo,
        cantidadMovimientos: count(transactions.id),
      })
      .from(categories)
      .leftJoin(transactions, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(categories.userId, userId),
          tipo ? eq(categories.tipo, tipo) : undefined,
        ),
      )
      .groupBy(categories.id)
      .orderBy(sql`lower(${categories.nombre})`, categories.id);
  }

  async obtener(userId: string, id: string): Promise<Categoria | null> {
    const [fila] = await this.db
      .select({
        id: categories.id,
        nombre: categories.nombre,
        tipo: categories.tipo,
      })
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    return fila ?? null;
  }

  async crear(
    userId: string,
    datos: { nombre: string; tipo: TipoMovimiento },
  ): Promise<Categoria> {
    try {
      const [fila] = await this.db
        .insert(categories)
        .values({ ...datos, userId })
        .returning({
          id: categories.id,
          nombre: categories.nombre,
          tipo: categories.tipo,
        });
      return fila;
    } catch (e) {
      if (esViolacionUnica(e)) throw new ConflictoError('CATEGORIA_DUPLICADA');
      throw e;
    }
  }

  async renombrar(
    userId: string,
    id: string,
    nombre: string,
  ): Promise<Categoria> {
    try {
      const [fila] = await this.db
        .update(categories)
        .set({ nombre })
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .returning({
          id: categories.id,
          nombre: categories.nombre,
          tipo: categories.tipo,
        });
      if (!fila) throw new NoEncontradoError('Categoría no encontrada');
      return fila;
    } catch (e) {
      if (esViolacionUnica(e)) throw new ConflictoError('CATEGORIA_DUPLICADA');
      throw e;
    }
  }

  async contarMovimientos(userId: string, id: string): Promise<number> {
    const [fila] = await this.db
      .select({ n: count() })
      .from(transactions)
      .where(
        and(eq(transactions.categoryId, id), eq(transactions.userId, userId)),
      );
    return fila?.n ?? 0;
  }

  async eliminar(
    userId: string,
    id: string,
    modo: ModoEliminacion | null,
    destinoId?: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [cat] = await tx
        .select({ id: categories.id, tipo: categories.tipo })
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)));
      if (!cat) throw new NoEncontradoError('Categoría no encontrada');

      if (modo === 'mover') {
        const invalido = () =>
          new ValidacionError('Categoría destino inválida', 'DESTINO_INVALIDO');
        if (!destinoId || destinoId === id) throw invalido();
        const [destino] = await tx
          .select({ tipo: categories.tipo })
          .from(categories)
          .where(
            and(eq(categories.id, destinoId), eq(categories.userId, userId)),
          );
        if (!destino || destino.tipo !== cat.tipo) throw invalido();
      }

      const [{ n }] = await tx
        .select({ n: count() })
        .from(transactions)
        .where(
          and(eq(transactions.categoryId, id), eq(transactions.userId, userId)),
        );
      if (n > 0 && modo === null)
        throw new ValidacionError(
          'La categoría tiene movimientos; indica qué hacer con ellos',
          'MODO_REQUERIDO',
        );

      const propios = and(
        eq(transactions.categoryId, id),
        eq(transactions.userId, userId),
      );
      if (modo === 'eliminar_movimientos')
        await tx.delete(transactions).where(propios);
      else if (modo === 'conservar_sin_categoria')
        await tx.update(transactions).set({ categoryId: null }).where(propios);
      else if (modo === 'mover')
        await tx
          .update(transactions)
          .set({ categoryId: destinoId })
          .where(propios);

      await tx
        .delete(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    });
  }
}
