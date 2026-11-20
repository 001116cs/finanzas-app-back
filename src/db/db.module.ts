import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cargarEnv } from '../config/env.js';
import * as schema from './schema.js';

export const DB = 'DB';

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => drizzle(postgres(cargarEnv().DATABASE_URL), { schema }),
    },
  ],
  exports: [DB],
})
export class DbModule {}
