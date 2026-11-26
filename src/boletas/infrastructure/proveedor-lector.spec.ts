import { describe, expect, it } from 'vitest';
import { cargarEnv } from '../../config/env.js';
import { LectorClaude } from './lector-claude.js';
import { LectorFalso } from './lector-falso.js';
import { crearLectorDeBoletas } from './proveedor-lector.js';

const base = {
  DATABASE_URL: 'postgres://x',
  SUPABASE_URL: 'https://x.supabase.co',
  FRONT_URL: 'http://localhost:3000',
};

describe('crearLectorDeBoletas', () => {
  it('falso → LectorFalso', () => {
    expect(crearLectorDeBoletas(cargarEnv(base))).toBeInstanceOf(LectorFalso);
  });

  it('claude → LectorClaude (sin llamar)', () => {
    const env = cargarEnv({
      ...base,
      AI_PROVIDER: 'claude',
      ANTHROPIC_API_KEY: 'k-de-prueba',
    });
    expect(crearLectorDeBoletas(env)).toBeInstanceOf(LectorClaude);
  });
});
