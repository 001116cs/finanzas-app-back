import { z } from 'zod';

const esquemaEnv = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  FRONT_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3001),
});

export type Env = z.infer<typeof esquemaEnv>;

/** Valida las variables de entorno; lanza un error claro si falta alguna. */
export function cargarEnv(fuente: NodeJS.ProcessEnv = process.env): Env {
  const resultado = esquemaEnv.safeParse(fuente);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Variables de entorno inválidas: ${detalle}`);
  }
  return resultado.data;
}
