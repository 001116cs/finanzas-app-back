export const TIPOS_MOVIMIENTO = ['gasto', 'ingreso'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];
