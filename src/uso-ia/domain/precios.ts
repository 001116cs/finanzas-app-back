/** Precios en USD por millón de tokens. */
const PRECIOS: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};

const FACTOR_ESCRITURA_CACHE = 1.25;
const FACTOR_LECTURA_CACHE = 0.1;
const MILLON = 1_000_000;

export interface UsoTokens {
  modelo: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export function esModeloConPrecio(modelo: string): boolean {
  return Object.hasOwn(PRECIOS, modelo);
}

export function costoUsd(uso: UsoTokens): number {
  if (!esModeloConPrecio(uso.modelo)) {
    throw new Error(`Modelo sin precio conocido: ${uso.modelo}`);
  }
  const p = PRECIOS[uso.modelo];
  return (
    (uso.inputTokens * p.input +
      uso.outputTokens * p.output +
      uso.cacheCreationTokens * p.input * FACTOR_ESCRITURA_CACHE +
      uso.cacheReadTokens * p.input * FACTOR_LECTURA_CACHE) /
    MILLON
  );
}
