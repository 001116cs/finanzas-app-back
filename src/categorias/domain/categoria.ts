import { ValidacionError } from '../../compartido/errores.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';

export interface Categoria {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
}

export interface CategoriaConConteo extends Categoria {
  cantidadMovimientos: number;
}

export const NOMBRE_MAX = 50;

/** Recorta y valida el nombre (1 a 50 caracteres). */
export function validarNombre(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio.length < 1 || limpio.length > NOMBRE_MAX)
    throw new ValidacionError(
      `El nombre debe tener entre 1 y ${NOMBRE_MAX} caracteres`,
    );
  return limpio;
}
