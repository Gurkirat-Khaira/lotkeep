CREATE TYPE "app"."key_scope" AS ENUM('dealer', 'customer', 'blind-index');--> statement-breakpoint
CREATE TABLE "app"."data_keys" (
	"dealer_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"scope" "app"."key_scope" NOT NULL,
	"subject_id" uuid NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"wrapped_key" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"destroyed_at" timestamp with time zone,
	CONSTRAINT "data_keys_dealer_id_id_pk" PRIMARY KEY("dealer_id","id"),
	CONSTRAINT "data_keys_version_positive" CHECK ("app"."data_keys"."key_version" > 0),
	CONSTRAINT "data_keys_destroyed_empty" CHECK ("app"."data_keys"."destroyed_at" is null or octet_length("app"."data_keys"."wrapped_key") = 0)
);
--> statement-breakpoint
ALTER TABLE "app"."data_keys" ADD CONSTRAINT "data_keys_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "app"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_keys_subject_version_unique" ON "app"."data_keys" USING btree ("dealer_id","scope","subject_id","key_version");--> statement-breakpoint
-- Dealer isolation (tenantRlsSql).
ALTER TABLE "app"."data_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."data_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "data_keys_tenant_isolation" ON "app"."data_keys" USING (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid) WITH CHECK (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid);
