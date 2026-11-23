import type { Monto } from '../../compartido/monto.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';

export interface FilaClave {
  fecha: string;
  monto: Monto;
  tipo: TipoMovimiento;
  descripcion: string;
}

export interface ImportacionRepository {
  /**
   * Claves (`claveDuplicado`) de los movimientos ya guardados del usuario que
   * coinciden con alguna de las filas. Una sola consulta por lote.
   */
  clavesExistentes(userId: string, filas: FilaClave[]): Promise<Set<string>>;
}

export const IMPORTACION_REPOSITORY = Symbol('IMPORTACION_REPOSITORY');
