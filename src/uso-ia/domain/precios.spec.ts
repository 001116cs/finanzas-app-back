import { describe, expect, it } from 'vitest';
import { costoUsd, esModeloConPrecio } from './precios.js';

const M = 1_000_000;
const uso = (over: object = {}) => ({
  modelo: 'claude-sonnet-5-5',
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  ...over,
});

describe('costoUsd', () => {
  it('sonnet 1M in + 1M out = 12', () => {
    expect(costoUsd(uso({ inputTokens: M, outputTokens: M }))).toBeCloseTo(12);
  });
  it('opus 1M in = 4', () => {
    expect(
      costoUsd(uso({ modelo: 'claude-opus-5-5', inputTokens: M })),
    ).toBeCloseTo(4);
  });
  it('haiku 1M in + 1M out = 0.6', () => {
    expect(
      costoUsd(
        uso({ modelo: 'claude-haiku-5-5', inputTokens: M, outputTokens: M }),
      ),
    ).toBeCloseTo(0.6);
  });
  it('escritura de caché = 1.25 x input', () => {
    expect(costoUsd(uso({ cacheCreationTokens: M }))).toBeCloseTo(2.5);
  });
  it('lectura de caché = 0.1 x input', () => {
    expect(costoUsd(uso({ cacheReadTokens: M }))).toBeCloseTo(0.2);
  });
  it('modelo desconocido lanza', () => {
    expect(() => costoUsd(uso({ modelo: 'gpt-x' }))).toThrow(Error);
  });
});

describe('esModeloConPrecio', () => {
  it('distingue modelos', () => {
    expect(esModeloConPrecio('claude-haiku-5-5')).toBe(true);
    expect(esModeloConPrecio('gpt-x')).toBe(false);
  });
});
