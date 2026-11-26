import type { Monto } from '../../compartido/monto.js';
import type { TipoMovimiento } from '../../compartido/tipos.js';
import type { Transaccion } from '../domain/transaccion.js';

export interface DatosTransaccion {
  tipo: TipoMovimiento;
  monto: Monto;
  fecha: string;
  descripcion: string;
  categoriaId: string | null;
}

export interface FiltrosTransaccion {
  desde?: string;
  hasta?: string;
  tipo?: TipoMovimiento;
  /** `'sin'` = sin categoría. */
  categoriaId?: string;
  /** 'fecha' (por defecto): fecha desc. 'reciente': createdAt desc. */
  orden?: 'fecha' | 'fecha_asc' | 'reciente';
  pagina: number;
  tamano: number;
}

export interface TotalCategoria {
  categoriaId: string | null;
  nombre: string;
  tipo: TipoMovimiento;
  centavos: number;
}

export interface TransaccionRepository {
  /** El origen siempre es 'manual' en esta fase. */
  crear(userId: string, datos: DatosTransaccion): Promise<Transaccion>;
  obtener(userId: string, id: string): Promise<Transaccion | null>;
  /** null si no existe para ese usuario. */
  actualizar(
    userId: string,
    id: string,
    cambios: Partial<DatosTransaccion>,
  ): Promise<Transaccion | null>;
  /** false si no existe para ese usuario. */
  eliminar(userId: string, id: string): Promise<boolean>;
  /** Orden según filtros.orden (por defecto fecha desc, createdAt desc). */
  listar(
    userId: string,
    filtros: FiltrosTransaccion,
  ): Promise<{ items: Transaccion[]; total: number }>;
  /** Suma por (categoría, tipo) en [desde, hasta], ambos inclusive. */
  totales(
    userId: string,
    desde: string,
    hasta: string,
  ): Promise<{ porCategoria: TotalCategoria[] }>;
}

export const TRANSACCION_REPOSITORY = Symbol('TRANSACCION_REPOSITORY');
