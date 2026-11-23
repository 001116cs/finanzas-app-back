import type { Monto } from '../../compartido/monto.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import type { FilaPreparada } from '../domain/fila-importada.js';

export interface FilaClave {
  fecha: string;
  monto: Monto;
  tipo: TipoMovimiento;
  descripcion: string;
}

export interface Importacion {
  id: string;
  nombreArchivo: string;
  filasImportadas: number;
  createdAt: Date;
}

export interface ImportacionRepository {
  /**
   * Claves (`claveDuplicado`) de los movimientos ya guardados del usuario que
   * coinciden con alguna de las filas. Una sola consulta por lote.
   */
  clavesExistentes(userId: string, filas: FilaClave[]): Promise<Set<string>>;
  /**
   * Una sola transacción: crea (o reutiliza, sin distinguir mayúsculas) cada
   * categoría nueva, crea el import e inserta las filas con origen 'excel'.
   * Las filas con `categoriaNueva` se enlazan a la categoría del mismo tipo.
   */
  guardar(
    userId: string,
    datos: {
      nombreArchivo: string;
      categoriasNuevas: { nombre: string; tipo: TipoMovimiento }[];
      filas: FilaPreparada[];
    },
  ): Promise<Importacion>;
}

export const IMPORTACION_REPOSITORY = Symbol('IMPORTACION_REPOSITORY');
