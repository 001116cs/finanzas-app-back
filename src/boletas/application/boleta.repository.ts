import type { Monto } from '../../compartido/monto.js';
import type { Transaccion } from '../../transacciones/domain/transaccion.js';

export interface GastoDeBoleta {
  descripcion: string;
  monto: Monto;
  categoriaId: string | null;
}

export interface Boleta {
  id: string;
  comercio: string;
  fecha: string;
  totalImpreso: string | null;
  rutaImagen: string;
  createdAt: Date;
}

export interface ResumenBoleta {
  id: string;
  comercio: string;
  fecha: string;
  totalImpreso: string | null;
  gastos: number;
  sumaGastos: string;
  createdAt: Date;
}

export interface CambiosBoleta {
  comercio?: string;
  fecha?: string;
  totalImpreso?: Monto | null;
}

export interface BoletaRepository {
  /** Una transacción: crea el receipt y un gasto (tipo 'gasto', origen 'boleta', fecha = la de la boleta, receipt_id) por cada item. */
  crearConGastos(
    userId: string,
    datos: {
      rutaImagen: string;
      comercio: string;
      fecha: string;
      totalImpreso: Monto | null;
      gastos: GastoDeBoleta[];
    },
  ): Promise<{ id: string; gastosCreados: number }>;
  obtener(userId: string, id: string): Promise<Boleta | null>;
  /** Borra el receipt (los gastos quedan con receipt_id null por la FK). Devuelve la ruta de la imagen o null si no existe/es ajena. */
  eliminar(userId: string, id: string): Promise<string | null>;
  /** Una transacción: bloquea la boleta del usuario (FOR UPDATE; si no existe/es ajena devuelve null sin borrar nada), borra sus gastos y la boleta. Devuelve la ruta de la imagen. */
  eliminarConGastos(userId: string, id: string): Promise<string | null>;
  /** Orden fecha desc, created_at desc, id. Cuenta y suma (numeric) los gastos enlazados. */
  listar(
    userId: string,
    pagina: number,
    tamano: number,
  ): Promise<{ items: ResumenBoleta[]; total: number }>;
  /** Gastos enlazados a la boleta, orden created_at, id. */
  gastosDe(userId: string, id: string): Promise<Transaccion[]>;
  /** Una transacción; si cambia la fecha, propaga a los gastos de la boleta. false si no existe/es ajena. */
  actualizarCabecera(
    userId: string,
    id: string,
    cambios: CambiosBoleta,
  ): Promise<boolean>;
  /** Inserta un gasto con la fecha de la boleta. null si no existe/es ajena. */
  agregarGasto(
    userId: string,
    id: string,
    gasto: GastoDeBoleta,
  ): Promise<Transaccion | null>;
}

export const BOLETA_REPOSITORY = Symbol('BOLETA_REPOSITORY');
