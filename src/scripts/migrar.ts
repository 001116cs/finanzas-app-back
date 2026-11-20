import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta DATABASE_URL');

const cliente = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(cliente), { migrationsFolder: './drizzle' });
  console.log('Migraciones aplicadas');
} finally {
  await cliente.end();
}
