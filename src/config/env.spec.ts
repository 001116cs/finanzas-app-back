import { describe, expect, it } from 'vitest';
import { cargarEnv } from './env.js';

const minimo = {
  DATABASE_URL: 'postgres://x',
  SUPABASE_URL: 'https://x.supabase.co',
  FRONT_URL: 'http://localhost:3000',
};

describe('cargarEnv', () => {
  it('aplica los defaults de almacenamiento', () => {
    const env = cargarEnv(minimo);
    expect(env.STORAGE_DRIVER).toBe('disco');
    expect(env.STORAGE_LOCAL_DIR).toBe('.almacen-local');
    expect(env.STORAGE_BUCKET).toBe('boletas');
  });

  it('en producción exige STORAGE_DRIVER', () => {
    expect(() => cargarEnv({ ...minimo, NODE_ENV: 'production' })).toThrow(
      /Variables de entorno inválidas: .*STORAGE_DRIVER: obligatoria en producción/,
    );
  });

  it('supabase sin SUPABASE_SERVICE_ROLE_KEY lanza', () => {
    expect(() => cargarEnv({ ...minimo, STORAGE_DRIVER: 'supabase' })).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it('supabase con key es válido', () => {
    const env = cargarEnv({
      ...minimo,
      STORAGE_DRIVER: 'supabase',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
    });
    expect(env.STORAGE_DRIVER).toBe('supabase');
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('k');
  });

  it('en producción con driver explícito es válido', () => {
    const env = cargarEnv({
      ...minimo,
      NODE_ENV: 'production',
      STORAGE_DRIVER: 'disco',
      AI_PROVIDER: 'falso',
    });
    expect(env.STORAGE_DRIVER).toBe('disco');
  });
});

describe('cargarEnv (límites de IA)', () => {
  it('aplica los defaults de IA', () => {
    const env = cargarEnv(minimo);
    expect(env.AI_LIMIT_RECEIPTS).toBe(20);
    expect(env.AI_LIMIT_FAILED_ATTEMPTS).toBe(10);
    expect(env.AI_GLOBAL_MONTHLY_BUDGET_USD).toBe(10);
    expect(env.AI_MODEL_RECEIPTS).toBe('claude-sonnet-5-5');
  });

  it('AI_MODEL_RECEIPTS sin precio conocido lanza', () => {
    expect(() => cargarEnv({ ...minimo, AI_MODEL_RECEIPTS: 'gpt-x' })).toThrow(
      /AI_MODEL_RECEIPTS: modelo sin precio conocido/,
    );
  });

  it('coacciona los límites numéricos', () => {
    const env = cargarEnv({
      ...minimo,
      AI_LIMIT_RECEIPTS: '5',
      AI_GLOBAL_MONTHLY_BUDGET_USD: '2.5',
    });
    expect(env.AI_LIMIT_RECEIPTS).toBe(5);
    expect(env.AI_GLOBAL_MONTHLY_BUDGET_USD).toBe(2.5);
  });
});

describe('cargarEnv (proveedor de IA)', () => {
  it('AI_PROVIDER es falso por defecto fuera de producción', () => {
    expect(cargarEnv(minimo).AI_PROVIDER).toBe('falso');
  });

  it('en producción exige AI_PROVIDER', () => {
    expect(() =>
      cargarEnv({ ...minimo, NODE_ENV: 'production', STORAGE_DRIVER: 'disco' }),
    ).toThrow(/AI_PROVIDER: obligatoria en producción/);
  });

  it('claude sin ANTHROPIC_API_KEY lanza', () => {
    expect(() => cargarEnv({ ...minimo, AI_PROVIDER: 'claude' })).toThrow(
      /ANTHROPIC_API_KEY: obligatoria con AI_PROVIDER=claude/,
    );
  });

  it('claude con key es válido', () => {
    const env = cargarEnv({
      ...minimo,
      AI_PROVIDER: 'claude',
      ANTHROPIC_API_KEY: 'k',
    });
    expect(env.AI_PROVIDER).toBe('claude');
  });
});
