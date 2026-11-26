import { describe, expect, it } from 'vitest';
import { evaluarCupoBoletas, mesEnZona, mesUtc } from './limites.js';

const base = {
  usadas: 0,
  fallidos: 0,
  limite: 20,
  limiteFallidos: 10,
  costoGlobalUsd: 0,
  presupuestoUsd: 10,
};

describe('evaluarCupoBoletas', () => {
  it('19/20 -> ok', () => {
    expect(evaluarCupoBoletas({ ...base, usadas: 19 })).toBeNull();
  });
  it('20/20 -> LIMITE_BOLETAS', () => {
    expect(evaluarCupoBoletas({ ...base, usadas: 20 })).toBe('LIMITE_BOLETAS');
  });
  it('fallidos 10/10 -> LIMITE_INTENTOS_FALLIDOS', () => {
    expect(evaluarCupoBoletas({ ...base, fallidos: 10 })).toBe(
      'LIMITE_INTENTOS_FALLIDOS',
    );
  });
  it('costo global >= presupuesto -> LIMITE_GLOBAL_IA', () => {
    expect(evaluarCupoBoletas({ ...base, costoGlobalUsd: 10 })).toBe(
      'LIMITE_GLOBAL_IA',
    );
  });
  it('global y cupo agotados -> prioridad global', () => {
    expect(
      evaluarCupoBoletas({ ...base, costoGlobalUsd: 11, usadas: 20 }),
    ).toBe('LIMITE_GLOBAL_IA');
  });
  it('cupo y fallidos agotados -> prioridad cupo', () => {
    expect(evaluarCupoBoletas({ ...base, usadas: 20, fallidos: 10 })).toBe(
      'LIMITE_BOLETAS',
    );
  });
});

describe('mes', () => {
  const t = new Date('2026-12-01T03:00:00Z');
  it('mesEnZona usa la zona del usuario', () => {
    expect(mesEnZona(t, 'America/Lima')).toBe('2026-11');
  });
  it('mesUtc usa UTC', () => {
    expect(mesUtc(t)).toBe('2026-12');
  });
});
