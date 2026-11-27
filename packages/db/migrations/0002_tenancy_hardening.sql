CREATE INDEX "membership_locations_location_idx" ON "app"."membership_locations" USING btree ("dealer_id","location_id");--> statement-breakpoint
-- users is global (no RLS): dms_app may read and add logins but never change or remove one,
-- since one dealer's transaction could otherwise hijack another dealer's user (ADR 0005).
REVOKE UPDATE, DELETE ON "app"."users" FROM dms_app;
