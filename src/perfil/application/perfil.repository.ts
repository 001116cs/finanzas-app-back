import type { CategoriaSugerida, Perfil } from '../domain/perfil.js';

export interface PerfilRepository {
  obtener(userId: string): Promise<Perfil | null>;
  /** Crea el perfil y sus categorías en una sola transacción. */
  crearConCategorias(
    perfil: Perfil,
    categorias: readonly CategoriaSugerida[],
  ): Promise<void>;
  actualizar(perfil: Perfil): Promise<void>;
}

export const PERFIL_REPOSITORY = Symbol('PERFIL_REPOSITORY');
