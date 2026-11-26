import type { UsoTokens } from '../../uso-ia/domain/precios.js';
import type { LecturaCruda } from '../domain/lectura.js';

export interface ImagenBoleta {
  bytes: Uint8Array;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export type ResultadoLectura =
  | { tipo: 'ok'; cruda: LecturaCruda; uso: UsoTokens }
  | { tipo: 'ilegible'; uso: UsoTokens };

export interface LectorDeBoletas {
  /** `categorias` son los NOMBRES de las categorías de gasto del usuario. */
  leer(imagen: ImagenBoleta, categorias: string[]): Promise<ResultadoLectura>;
}

export const LECTOR_DE_BOLETAS = Symbol('LECTOR_DE_BOLETAS');
