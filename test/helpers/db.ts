import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export function urlBdTest(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Falta DATABASE_URL_TEST');
  return url;
}

export async function migrarBdTest(): Promise<void> {
  const cliente = postgres(urlBdTest(), { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(cliente), { migrationsFolder: './drizzle' });
  } finally {
    await cliente.end();
  }
}

export async function truncarTodo(): Promise<void> {
  const cliente = postgres(urlBdTest(), { max: 1 });
  try {
    await cliente.unsafe(
      'TRUNCATE TABLE transactions, imports, categories, profiles RESTART IDENTITY CASCADE',
    );
  } finally {
    await cliente.end();
  }
}
