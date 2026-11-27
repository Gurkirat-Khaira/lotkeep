CREATE TYPE "app"."location_kind" AS ENUM('main', 'branch');--> statement-breakpoint
CREATE TYPE "app"."membership_role" AS ENUM('owner', 'fi', 'sales', 'auditor');--> statement-breakpoint
CREATE TABLE "app"."dealers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text NOT NULL,
	"entity_number" text,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."locations" (
	"dealer_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "app"."location_kind" NOT NULL,
	"address_line1" text NOT NULL,
	"suite_raw" text,
	"suite_normalized" text,
	"city" text NOT NULL,
	"state" char(2) NOT NULL,
	"zip" text NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_dealer_id_id_pk" PRIMARY KEY("dealer_id","id"),
	CONSTRAINT "locations_state_format" CHECK ("app"."locations"."state" ~ '^[A-Z]{2}$'),
	CONSTRAINT "locations_zip_format" CHECK ("app"."locations"."zip" ~ '^[0-9]{5}(-[0-9]{4})?$')
);
--> statement-breakpoint
CREATE TABLE "app"."membership_locations" (
	"dealer_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	CONSTRAINT "membership_locations_dealer_id_membership_id_location_id_pk" PRIMARY KEY("dealer_id","membership_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "app"."memberships" (
	"dealer_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app"."membership_role" NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "memberships_dealer_id_id_pk" PRIMARY KEY("dealer_id","id"),
	CONSTRAINT "memberships_dealer_user_unique" UNIQUE("dealer_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" "citext" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "app"."locations" ADD CONSTRAINT "locations_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "app"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."membership_locations" ADD CONSTRAINT "membership_locations_membership_fk" FOREIGN KEY ("dealer_id","membership_id") REFERENCES "app"."memberships"("dealer_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."membership_locations" ADD CONSTRAINT "membership_locations_location_fk" FOREIGN KEY ("dealer_id","location_id") REFERENCES "app"."locations"("dealer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "app"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "app"."memberships" USING btree ("user_id");
--> statement-breakpoint
-- Dealer isolation (tenantRlsSql). dealers is keyed on its own id.
ALTER TABLE "app"."dealers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."dealers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "dealers_tenant_isolation" ON "app"."dealers" USING (id = NULLIF(current_setting('app.dealer_id', true), '')::uuid) WITH CHECK (id = NULLIF(current_setting('app.dealer_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "app"."locations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."locations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "locations_tenant_isolation" ON "app"."locations" USING (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid) WITH CHECK (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "app"."memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."memberships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "memberships_tenant_isolation" ON "app"."memberships" USING (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid) WITH CHECK (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "app"."membership_locations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."membership_locations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "membership_locations_tenant_isolation" ON "app"."membership_locations" USING (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid) WITH CHECK (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid);
