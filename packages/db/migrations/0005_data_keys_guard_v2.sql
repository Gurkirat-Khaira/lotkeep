ALTER TABLE "app"."data_keys" ADD CONSTRAINT "data_keys_live_has_material" CHECK ("app"."data_keys"."destroyed_at" is not null or octet_length("app"."data_keys"."wrapped_key") > 0);--> statement-breakpoint
-- Guard v2 (code review): its own SQLSTATE (DMS01), destroyed rows are immutable, only customer
-- keys can be destroyed, and a tombstoned subject can never get a new key (any version).
CREATE OR REPLACE FUNCTION "app"."data_keys_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.destroyed_at IS NOT NULL AND NEW.scope <> 'customer' THEN
      RAISE EXCEPTION 'only customer keys can be destroyed' USING ERRCODE = 'DMS01';
    END IF;
    IF EXISTS (SELECT 1 FROM "app"."data_keys" k
               WHERE k.dealer_id = NEW.dealer_id AND k.scope = NEW.scope
                 AND k.subject_id = NEW.subject_id AND k.destroyed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'this subject was crypto-shredded' USING ERRCODE = 'DMS01';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.id <> OLD.id OR NEW.scope <> OLD.scope OR NEW.subject_id <> OLD.subject_id
     OR NEW.key_version <> OLD.key_version OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'data_keys identity columns are immutable' USING ERRCODE = 'DMS01';
  END IF;
  IF OLD.destroyed_at IS NOT NULL THEN
    RAISE EXCEPTION 'a destroyed key cannot change' USING ERRCODE = 'DMS01';
  END IF;
  IF NEW.destroyed_at IS NOT NULL AND OLD.scope <> 'customer' THEN
    RAISE EXCEPTION 'only customer keys can be destroyed' USING ERRCODE = 'DMS01';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
DROP TRIGGER "data_keys_guard" ON "app"."data_keys";
--> statement-breakpoint
CREATE TRIGGER "data_keys_guard" BEFORE INSERT OR UPDATE ON "app"."data_keys"
  FOR EACH ROW EXECUTE FUNCTION "app"."data_keys_guard"();
