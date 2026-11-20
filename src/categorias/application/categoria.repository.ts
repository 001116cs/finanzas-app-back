import type { TipoMovimiento } from '../../compartido/tipos.js';
import type { Categoria, CategoriaConConteo } from '../domain/categoria.js';

export type ModoEliminacion =
  'eliminar_movimientos' | 'conservar_sin_categoria' | 'mover';

export const MODOS_ELIMINACION: readonly ModoEliminacion[] = [
  'eliminar_movimientos',
  'conservar_sin_categoria',
  'mover',
];

export interface CategoriaRepository {
  /** Ordenadas por lower(nombre), id. */
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
  /**
   * Una sola transacción. NoEncontradoError si la categoría no es del usuario;
   * ValidacionError('MODO_REQUERIDO') si tiene movimientos y modo es null;
   * ValidacionError('DESTINO_INVALIDO') si 'mover' sin destino válido
   * (propio, distinto y del mismo tipo).
   */
  eliminar(
    userId: string,
    id: string,
    modo: ModoEliminacion | null,
    destinoId?: string,
  ): Promise<void>;
}

export const CATEGORIA_REPOSITORY = Symbol('CATEGORIA_REPOSITORY');
