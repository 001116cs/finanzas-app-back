import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cargarEnv } from '../config/env.js';
import * as schema from './schema.js';

export const DB = 'DB';
export const PG_CLIENT = 'PG_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: PG_CLIENT,
      useFactory: () => postgres(cargarEnv().DATABASE_URL),
    },
    {
      provide: DB,
      inject: [PG_CLIENT],
      useFactory: (cliente: postgres.Sql) => drizzle(cliente, { schema }),
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_CLIENT) private readonly cliente: postgres.Sql) {}

  async onApplicationShutdown() {
    await this.cliente.end();
  }
}
