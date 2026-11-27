-- data_keys hardening (Task 6 security review). Losing a dealer key loses all of that dealer's
-- PII, and deleting a tombstone would let a shredded customer's key be recreated.
REVOKE DELETE, TRUNCATE ON "app"."data_keys" FROM dms_app;
--> statement-breakpoint
-- A key row's identity never changes, a destroyed key stays destroyed and empty, and a live key's
-- material only changes on re-wrap (same scope, subject and version). dealer_id moves are left to
-- RLS WITH CHECK, which rejects them.
CREATE FUNCTION "app"."data_keys_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.scope <> OLD.scope OR NEW.subject_id <> OLD.subject_id
     OR NEW.key_version <> OLD.key_version OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'data_keys identity columns are immutable' USING ERRCODE = '55000';
  END IF;
  IF OLD.destroyed_at IS NOT NULL AND (NEW.destroyed_at IS NULL OR octet_length(NEW.wrapped_key) > 0) THEN
    RAISE EXCEPTION 'a destroyed key cannot be revived' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION "app"."data_keys_guard"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "data_keys_guard" BEFORE UPDATE ON "app"."data_keys"
  FOR EACH ROW EXECUTE FUNCTION "app"."data_keys_guard"();
