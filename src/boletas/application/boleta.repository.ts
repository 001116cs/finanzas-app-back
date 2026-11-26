import type { Monto } from '../../compartido/monto.js';

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
}

export const BOLETA_REPOSITORY = Symbol('BOLETA_REPOSITORY');
