import { z } from 'zod';
import { esModeloConPrecio } from '../uso-ia/domain/precios.js';

const esquemaEnv = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  FRONT_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.string().optional(),
  STORAGE_DRIVER: z.enum(['disco', 'supabase']).optional(),
  STORAGE_LOCAL_DIR: z.string().min(1).default('.almacen-local'),
  STORAGE_BUCKET: z.string().min(1).default('boletas'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AI_LIMIT_RECEIPTS: z.coerce.number().int().min(0).default(20),
  AI_LIMIT_FAILED_ATTEMPTS: z.coerce.number().int().min(0).default(10),
  AI_GLOBAL_MONTHLY_BUDGET_USD: z.coerce.number().min(0).default(10),
  AI_MODEL_RECEIPTS: z.string().default('claude-sonnet-5-5'),
  AI_PROVIDER: z.enum(['falso', 'claude']).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const esquemaResuelto = esquemaEnv
  .superRefine((env, ctx) => {
    if (!env.STORAGE_DRIVER && env.NODE_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['STORAGE_DRIVER'],
        message: 'obligatoria en producción',
      });
    }
    if (!env.AI_PROVIDER && env.NODE_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['AI_PROVIDER'],
        message: 'obligatoria en producción',
      });
    }
    if (env.AI_PROVIDER === 'claude' && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['ANTHROPIC_API_KEY'],
        message: 'obligatoria con AI_PROVIDER=claude',
      });
    }
    if (!esModeloConPrecio(env.AI_MODEL_RECEIPTS)) {
      ctx.addIssue({
        code: 'custom',
        path: ['AI_MODEL_RECEIPTS'],
        message: 'modelo sin precio conocido',
      });
    }
    if (env.STORAGE_DRIVER === 'supabase' && !env.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SUPABASE_SERVICE_ROLE_KEY'],
        message: 'obligatoria con STORAGE_DRIVER=supabase',
      });
    }
  })
  .transform((env) => ({
    ...env,
    STORAGE_DRIVER: env.STORAGE_DRIVER ?? ('disco' as const),
    AI_PROVIDER: env.AI_PROVIDER ?? ('falso' as const),
  }));

export type Env = z.infer<typeof esquemaResuelto>;

/** Valida las variables de entorno; lanza un error claro si falta alguna. */
export function cargarEnv(fuente: NodeJS.ProcessEnv = process.env): Env {
  const resultado = esquemaResuelto.safeParse(fuente);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Variables de entorno inválidas: ${detalle}`);
  }
  return resultado.data;
}
