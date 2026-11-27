-- Runs as dms_owner. Makes every database (dms, the test template, restored copies) self-contained:
-- grants and default privileges are per database, so they live here and not only in the
-- container init script.
CREATE SCHEMA IF NOT EXISTS "app";
--> statement-breakpoint
GRANT USAGE ON SCHEMA "app" TO dms_app;
--> statement-breakpoint
-- Tables and sequences dms_owner creates are usable (never owned) by dms_app.
ALTER DEFAULT PRIVILEGES FOR ROLE dms_owner IN SCHEMA "app" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dms_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE dms_owner IN SCHEMA "app" GRANT USAGE, SELECT ON SEQUENCES TO dms_app;
--> statement-breakpoint
-- No default EXECUTE: each migration grants the specific functions dms_app needs.
ALTER DEFAULT PRIVILEGES FOR ROLE dms_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
--> statement-breakpoint
-- citext (case-insensitive email) in schema app, because dms_app has no access to schema public.
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA "app";
