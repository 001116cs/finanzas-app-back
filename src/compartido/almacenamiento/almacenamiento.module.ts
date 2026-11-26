import { Global, Module } from '@nestjs/common';
import path from 'node:path';
import { cargarEnv } from '../../config/env.js';
import { ALMACEN_DE_ARCHIVOS } from './almacen-de-archivos.js';
import { AlmacenEnDisco } from './almacen-en-disco.js';
import { AlmacenSupabase } from './almacen-supabase.js';

@Global()
@Module({
  providers: [
    {
      provide: ALMACEN_DE_ARCHIVOS,
      useFactory: () => {
        const env = cargarEnv();
        if (env.STORAGE_DRIVER === 'supabase') {
          return new AlmacenSupabase({
            url: env.SUPABASE_URL,
            serviceKey: env.SUPABASE_SERVICE_ROLE_KEY!,
            bucket: env.STORAGE_BUCKET,
          });
        }
        return new AlmacenEnDisco(path.resolve(env.STORAGE_LOCAL_DIR));
      },
    },
  ],
  exports: [ALMACEN_DE_ARCHIVOS],
})
export class AlmacenamientoModule {}
