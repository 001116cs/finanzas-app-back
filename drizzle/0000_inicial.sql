CREATE TYPE "public"."origen_movimiento" AS ENUM('manual', 'excel', 'boleta');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento" AS ENUM('gasto', 'ingreso');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_movimiento" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"moneda" text NOT NULL,
	"zona_horaria" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" "tipo_movimiento" NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"fecha" date NOT NULL,
	"descripcion" text NOT NULL,
	"category_id" uuid,
	"origen" "origen_movimiento" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_monto_positivo" CHECK ("transactions"."monto" > 0)
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_tipo_nombre_uq" ON "categories" USING btree ("user_id","tipo",lower("nombre"));--> statement-breakpoint
CREATE INDEX "transactions_user_fecha_idx" ON "transactions" USING btree ("user_id","fecha");