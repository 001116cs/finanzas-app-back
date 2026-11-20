import type { TipoMovimiento } from '../../compartido/tipos.js';
import type { Categoria, CategoriaConConteo } from '../domain/categoria.js';

export interface CategoriaRepository {
  /** Ordenadas por nombre. */
  listar(userId: string, tipo?: TipoMovimiento): Promise<CategoriaConConteo[]>;
  obtener(userId: string, id: string): Promise<Categoria | null>;
  /** Lanza ConflictoError('CATEGORIA_DUPLICADA') si ya existe. */
  crear(
    userId: string,
    datos: { nombre: string; tipo: TipoMovimiento },
  ): Promise<Categoria>;
  /** Lanza ConflictoError('CATEGORIA_DUPLICADA') si ya existe. */
  renombrar(userId: string, id: string, nombre: string): Promise<Categoria>;
  contarMovimientos(userId: string, id: string): Promise<number>;
}

export const CATEGORIA_REPOSITORY = Symbol('CATEGORIA_REPOSITORY');
