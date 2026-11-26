import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Las e2e comparten una sola BD de test.
    fileParallelism: false,
    env: {
      DATABASE_URL_TEST:
        process.env.DATABASE_URL_TEST ??
        'postgres://finanzas:finanzas@localhost:5432/finanzas_test',
      SUPABASE_URL: process.env.SUPABASE_URL ?? 'https://test.supabase.co',
      FRONT_URL: process.env.FRONT_URL ?? 'http://localhost:3000',
      AI_PROVIDER: 'falso',
      STORAGE_DRIVER: 'disco',
      STORAGE_LOCAL_DIR: path.join(os.tmpdir(), 'finanzas-e2e-almacen'),
    },
  },
});
