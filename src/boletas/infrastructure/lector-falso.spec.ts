import { describe, expect, it } from 'vitest';
import { LectorFalso } from './lector-falso.js';

describe('LectorFalso', () => {
  it('devuelve una boleta fija con 3 productos', async () => {
    const r = await new LectorFalso().leer(
      { bytes: new Uint8Array([1]), mediaType: 'image/png' },
      ['Comida'],
    );
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') {
      expect(r.cruda.productos).toHaveLength(3);
      expect(r.cruda.fecha).toBe('2026-11-20');
      expect(r.uso.modelo).toBe('claude-sonnet-5-5');
    }
  });
});
