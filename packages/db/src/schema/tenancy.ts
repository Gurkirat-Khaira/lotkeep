// Tenancy: the dealer (legal entity) is the tenant; locations, memberships and their location
// assignments live inside it. Every table here except `users` is RLS-forced on dealer_id
// (dealers on id). See migrations/0001_tenancy.sql.
import { sql } from "drizzle-orm";
import {
  char,
  check,
  customType,
  foreignKey,
  index,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const app = pgSchema("app");

/** citext lives in schema `app` (0000_bootstrap) so dms_app can use it without access to public. */
const citext = customType<{ data: string }>({ dataType: () => "citext" });

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const timezone = () => text("timezone").notNull().default("America/Los_Angeles");

export const ROLES = ["owner", "fi", "sales", "auditor"] as const;
export type Role = (typeof ROLES)[number];

export const locationKind = app.enum("location_kind", ["main", "branch"]);
export const membershipRole = app.enum("membership_role", ROLES);

export const dealers = app.table("dealers", {
  id: uuid("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  entityNumber: text("entity_number"),
  timezone: timezone(),
  createdAt: createdAt(),
});

/** Global (not a tenant table): one login can belong to several dealers through memberships. */
export const users = app.table("users", {
  id: uuid("id").primaryKey(),
  email: citext("email").notNull().unique(),
  createdAt: createdAt(),
});

export const locations = app.table(
  "locations",
  {
    dealerId: uuid("dealer_id")
      .notNull()
      .references(() => dealers.id),
    id: uuid("id").notNull(),
    name: text("name").notNull(),
    kind: locationKind("kind").notNull(),
    addressLine1: text("address_line1").notNull(),
    suiteRaw: text("suite_raw"),
    suiteNormalized: text("suite_normalized"),
    city: text("city").notNull(),
    state: char("state", { length: 2 }).notNull(),
    zip: text("zip").notNull(),
    timezone: timezone(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.dealerId, t.id] }),
    check("locations_state_format", sql`${t.state} ~ '^[A-Z]{2}$'`),
    check("locations_zip_format", sql`${t.zip} ~ '^[0-9]{5}(-[0-9]{4})?$'`),
  ],
);

export const memberships = app.table(
  "memberships",
  {
    dealerId: uuid("dealer_id")
      .notNull()
      .references(() => dealers.id),
    id: uuid("id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: membershipRole("role").notNull(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.dealerId, t.id] }),
    unique("memberships_dealer_user_unique").on(t.dealerId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const membershipLocations = app.table(
  "membership_locations",
  {
    dealerId: uuid("dealer_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    locationId: uuid("location_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.dealerId, t.membershipId, t.locationId] }),
    index("membership_locations_location_idx").on(t.dealerId, t.locationId),
    // Composite FKs keep both sides inside the same dealer.
    foreignKey({
      name: "membership_locations_membership_fk",
      columns: [t.dealerId, t.membershipId],
      foreignColumns: [memberships.dealerId, memberships.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "membership_locations_location_fk",
      columns: [t.dealerId, t.locationId],
      foreignColumns: [locations.dealerId, locations.id],
    }),
  ],
);
