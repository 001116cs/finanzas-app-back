CREATE TABLE "ai_global_usage" (
	"mes" text PRIMARY KEY NOT NULL,
	"costo_estimado_usd" numeric(12, 6) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"user_id" uuid NOT NULL,
	"mes" text NOT NULL,
	"boletas_usadas" integer DEFAULT 0 NOT NULL,
	"preguntas_usadas" integer DEFAULT 0 NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_pk" PRIMARY KEY("user_id","mes")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ruta_imagen" text NOT NULL,
	"comercio" text NOT NULL,
	"fecha" date NOT NULL,
	"total_impreso" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "receipt_id" uuid;--> statement-breakpoint
CREATE INDEX "receipts_user_idx" ON "receipts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_receipt_idx" ON "transactions" USING btree ("receipt_id");