-- Runs once, as the container superuser, when the Postgres data volume is first created.
-- Passwords come from the container environment (set from the local .env by docker compose).
--   dms_owner: owns schema app; runs migrations, seeds and test setup. Not a superuser.
--   dms_app:   the runtime role. NOSUPERUSER NOBYPASSRLS NOCREATEDB, owns nothing.
\set ON_ERROR_STOP on
\getenv owner_pw DMS_OWNER_PASSWORD
\getenv app_pw DMS_APP_PASSWORD

-- CREATEDB lets the owner create per-worker test databases from dms_test_template (Task 4).
CREATE ROLE dms_owner LOGIN NOSUPERUSER CREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION
  PASSWORD :'owner_pw';
CREATE ROLE dms_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION NOINHERIT
  PASSWORD :'app_pw';

ALTER ROLE dms_app SET statement_timeout = '15s';
ALTER ROLE dms_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE dms_app SET search_path = app;
ALTER ROLE dms_owner SET search_path = app, public;

-- Nobody gets anything by default.
REVOKE ALL ON DATABASE dms FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE dms TO dms_owner;
GRANT CONNECT ON DATABASE dms TO dms_app;
-- The owner may create schemas (e.g. pgboss in Task 14) and trusted extensions (citext).
GRANT CREATE ON DATABASE dms TO dms_owner;

CREATE SCHEMA app AUTHORIZATION dms_owner;
GRANT USAGE ON SCHEMA app TO dms_app;

-- Tables and sequences the owner creates later are usable (not owned) by the app.
ALTER DEFAULT PRIVILEGES FOR ROLE dms_owner IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dms_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dms_owner IN SCHEMA app
  GRANT USAGE, SELECT ON SEQUENCES TO dms_app;
-- No default EXECUTE: a SECURITY DEFINER function runs as the owner and could bypass RLS, so each
-- migration grants EXECUTE on the specific functions the app needs. PUBLIC gets nothing.
ALTER DEFAULT PRIVILEGES FOR ROLE dms_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- NOTE for Plan 1 Task 4: grants, default privileges and REVOKEs are per database. Test databases
-- must be cloned from `dms` (TEMPLATE dms) so they inherit schema app and its default privileges,
-- and must re-run REVOKE ALL ON DATABASE <db> FROM PUBLIC (database ACLs are not copied).
