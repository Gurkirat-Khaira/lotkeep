// Wrapped data keys (packages/crypto). Only wrapped key material is stored, never a raw key.
//   scope 'dealer':      subject = dealer id, wrapped by the master key (KeyProvider)
//   scope 'customer':    subject = customer id, wrapped by the dealer key (crypto-shred unit)
//   scope 'blind-index': subject = dealer id, wrapped by the dealer key
import { sql } from "drizzle-orm";
import {
  check,
  customType,
  integer,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { app, dealers } from "./tenancy";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const keyScope = app.enum("key_scope", ["dealer", "customer", "blind-index"]);

export const dataKeys = app.table(
  "data_keys",
  {
    dealerId: uuid("dealer_id")
      .notNull()
      .references(() => dealers.id),
    id: uuid("id").notNull(),
    scope: keyScope("scope").notNull(),
    subjectId: uuid("subject_id").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    wrappedKey: bytea("wrapped_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    destroyedAt: timestamp("destroyed_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.dealerId, t.id] }),
    uniqueIndex("data_keys_subject_version_unique").on(
      t.dealerId,
      t.scope,
      t.subjectId,
      t.keyVersion,
    ),
    check("data_keys_version_positive", sql`${t.keyVersion} > 0`),
    // A live key always has key material; a destroyed key keeps none.
    check(
      "data_keys_live_has_material",
      sql`${t.destroyedAt} is not null or octet_length(${t.wrappedKey}) > 0`,
    ),
    // A destroyed key keeps no key material.
    check(
      "data_keys_destroyed_empty",
      sql`${t.destroyedAt} is null or octet_length(${t.wrappedKey}) = 0`,
    ),
  ],
);
