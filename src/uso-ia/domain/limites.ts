import { fechaEnZona } from '../../compartido/fechas.js';

export type CodigoLimiteIa =
  'LIMITE_GLOBAL_IA' | 'LIMITE_BOLETAS' | 'LIMITE_INTENTOS_FALLIDOS';

/** Mes (YYYY-MM) de un instante en una zona IANA. */
export function mesEnZona(ahora: Date, zona: string): string {
  return fechaEnZona(ahora, zona).slice(0, 7);
}

/** Mes (YYYY-MM) de un instante en UTC (mes del tope global). */
export function mesUtc(ahora: Date): string {
  return ahora.toISOString().slice(0, 7);
}

export interface EntradaCupo {
  usadas: number;
  fallidos: number;
  limite: number;
  limiteFallidos: number;
  costoGlobalUsd: number;
  presupuestoUsd: number;
}

/** Evalúa en orden global, cupo y fallidos; `null` significa que hay cupo. */
export function evaluarCupoBoletas(e: EntradaCupo): CodigoLimiteIa | null {
  if (e.costoGlobalUsd >= e.presupuestoUsd) return 'LIMITE_GLOBAL_IA';
  if (e.usadas >= e.limite) return 'LIMITE_BOLETAS';
  if (e.fallidos >= e.limiteFallidos) return 'LIMITE_INTENTOS_FALLIDOS';
  return null;
}
