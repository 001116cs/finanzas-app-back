import { ValidacionError } from '../../compartido/errores.js';
import type { Monto } from '../../compartido/monto.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import type { Categoria } from '../../categorias/domain/categoria.js';

export type OrigenMovimiento = 'manual' | 'excel' | 'boleta';

export interface Transaccion {
  id: string;
  tipo: TipoMovimiento;
  monto: Monto;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  categoriaId: string | null;
  categoriaNombre: string | null;
  origen: OrigenMovimiento;
  createdAt: Date;
}

export const DESCRIPCION_MAX = 200;

/** Recorta y valida la descripción (1 a 200 caracteres). */
export function validarDescripcion(texto: string): string {
  const limpia = texto.trim();
  if (limpia.length < 1 || limpia.length > DESCRIPCION_MAX)
    throw new ValidacionError(
      `La descripción debe tener entre 1 y ${DESCRIPCION_MAX} caracteres`,
    );
  return limpia;
}

/** Exige YYYY-MM-DD y que sea una fecha real del calendario. */
export function validarFecha(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (m) {
    const [y, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dt = new Date(Date.UTC(y, mes - 1, d));
    if (
      y >= 1 &&
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === mes - 1 &&
      dt.getUTCDate() === d
    )
      return fecha;
  }
  throw new ValidacionError(
    'La fecha debe ser válida con formato YYYY-MM-DD',
    'FECHA_INVALIDA',
  );
}

/** La categoría debe existir para el usuario y ser del mismo tipo. */
export function validarCategoria(
  categoria: Categoria | null,
  tipo: TipoMovimiento,
): void {
  if (!categoria || categoria.tipo !== tipo)
    throw new ValidacionError(
      'La categoría no existe o no corresponde al tipo de movimiento',
      'CATEGORIA_INCOMPATIBLE',
    );
}
