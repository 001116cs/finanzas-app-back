import {
  ValidacionError,
  ValidacionFilaError,
} from '../../compartido/errores.js';
import { Monto } from '../../compartido/monto.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import {
  validarDescripcion,
  validarFecha,
} from '../../transacciones/domain/transaccion.js';

export type FilaEntrada = {
  fecha: string | null;
  descripcion: string;
  monto: string;
  tipo: TipoMovimiento;
  categoriaId: string | null;
  categoriaNueva: string | null;
};

export type FilaPreparada = {
  fecha: string;
  descripcion: string;
  monto: Monto;
  tipo: TipoMovimiento;
  categoriaId: string | null;
  categoriaNueva: string | null;
};

/**
 * Valida una fila del lote reutilizando las reglas de transacciones.
 * Cualquier ValidacionError sale envuelto con el índice (0-based) de la fila.
 */
export function prepararFila(
  fila: FilaEntrada,
  indice: number,
  hoy: string,
): FilaPreparada {
  try {
    const fecha = fila.fecha === null ? hoy : validarFecha(fila.fecha);
    const descripcion = validarDescripcion(fila.descripcion);
    const monto = Monto.desdeTexto(fila.monto);
    if (fila.categoriaId !== null && fila.categoriaNueva !== null)
      throw new ValidacionError(
        'Una fila no puede tener categoría existente y nueva a la vez',
        'CATEGORIA_NUEVA_INVALIDA',
      );
    return {
      fecha,
      descripcion,
      monto,
      tipo: fila.tipo,
      categoriaId: fila.categoriaId,
      categoriaNueva: fila.categoriaNueva,
    };
  } catch (e) {
    if (e instanceof ValidacionError) throw new ValidacionFilaError(indice, e);
    throw e;
  }
}

/** Clave para comparar contra movimientos ya guardados. */
export function claveDuplicado(f: {
  fecha: string;
  monto: Monto;
  tipo: TipoMovimiento;
  descripcion: string;
}): string {
  return `${f.fecha}|${f.monto.centavos}|${f.tipo}|${f.descripcion.trim().toLowerCase()}`;
}

export const MAX_FILAS_LOTE = 2000;

/** Clave de una categoría nueva dentro del lote: tipo + nombre sin mayúsculas. */
export function claveCategoriaNueva(
  tipo: TipoMovimiento,
  nombre: string,
): string {
  return `${tipo}|${nombre.trim().toLowerCase()}`;
}
