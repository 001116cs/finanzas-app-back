import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const tipoMovimiento = pgEnum('tipo_movimiento', ['gasto', 'ingreso']);
export const origenMovimiento = pgEnum('origen_movimiento', [
  'manual',
  'excel',
  'boleta',
]);

// `id` es el id de Supabase Auth; sin FK porque auth.users no existe en local.
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  moneda: text('moneda').notNull(),
  zonaHoraria: text('zona_horaria').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    nombre: text('nombre').notNull(),
    tipo: tipoMovimiento('tipo').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('categories_user_tipo_nombre_uq').on(
      t.userId,
      t.tipo,
      sql`lower(${t.nombre})`,
    ),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    tipo: tipoMovimiento('tipo').notNull(),
    monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
    fecha: date('fecha').notNull(),
    descripcion: text('descripcion').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    origen: origenMovimiento('origen').notNull().default('manual'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('transactions_monto_positivo', sql`${t.monto} > 0`),
    index('transactions_user_fecha_idx').on(t.userId, t.fecha),
  ],
);
