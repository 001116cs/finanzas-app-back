import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
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

export const imports = pgTable(
  'imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    nombreArchivo: text('nombre_archivo').notNull(),
    filasImportadas: integer('filas_importadas').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('imports_user_idx').on(t.userId)],
);

export const receipts = pgTable(
  'receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    rutaImagen: text('ruta_imagen').notNull(),
    comercio: text('comercio').notNull(),
    fecha: date('fecha').notNull(),
    totalImpreso: numeric('total_impreso', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('receipts_user_idx').on(t.userId)],
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
    importId: uuid('import_id').references(() => imports.id, {
      onDelete: 'cascade',
    }),
    receiptId: uuid('receipt_id').references(() => receipts.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('transactions_monto_positivo', sql`${t.monto} > 0`),
    index('transactions_user_fecha_idx').on(t.userId, t.fecha),
    index('transactions_import_idx').on(t.importId),
    index('transactions_receipt_idx').on(t.receiptId),
  ],
);

export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: uuid('user_id').notNull(),
    mes: text('mes').notNull(), // YYYY-MM
    boletasUsadas: integer('boletas_usadas').notNull().default(0),
    preguntasUsadas: integer('preguntas_usadas').notNull().default(0),
    intentosFallidos: integer('intentos_fallidos').notNull().default(0),
  },
  (t) => [primaryKey({ name: 'ai_usage_pk', columns: [t.userId, t.mes] })],
);

export const aiGlobalUsage = pgTable('ai_global_usage', {
  mes: text('mes').primaryKey(),
  costoEstimadoUsd: numeric('costo_estimado_usd', { precision: 12, scale: 6 })
    .notNull()
    .default('0'),
});
