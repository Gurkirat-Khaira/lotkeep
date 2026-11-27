// Seed helpers: each test seeds its own dealers with fresh ids (synthetic data only).
import { newId } from "@dms/core";
import { dealers, locations, membershipLocations, memberships, type Role, users } from "../../src";
import { asOwner, ownerDb } from "./db";

export async function seedDealer(legalName = "Example Motors Inc."): Promise<string> {
  const id = newId();
  await asOwner(id, (tx) => tx.insert(dealers).values({ id, legalName }));
  return id;
}

export async function seedLocation(
  dealerId: string,
  kind: "main" | "branch" = "main",
): Promise<string> {
  const id = newId();
  await asOwner(dealerId, (tx) =>
    tx.insert(locations).values({
      dealerId,
      id,
      name: kind === "main" ? "Main Lot" : "Second Lot",
      kind,
      addressLine1: "100 Example Ave",
      city: "Testville",
      state: "CA",
      zip: "90000",
    }),
  );
  return id;
}

/** A user with a membership in `dealerId` and (for fi/sales) assigned locations. */
export async function seedUser(
  dealerId: string,
  role: Role,
  locationIds: string[] = [],
): Promise<{ userId: string; membershipId: string }> {
  const userId = newId();
  const membershipId = newId();
  await ownerDb.insert(users).values({ id: userId, email: `user-${userId}@example.test` });
  await asOwner(dealerId, async (tx) => {
    await tx.insert(memberships).values({ dealerId, id: membershipId, userId, role });
    if (locationIds.length > 0) {
      await tx
        .insert(membershipLocations)
        .values(locationIds.map((locationId) => ({ dealerId, membershipId, locationId })));
    }
  });
  return { userId, membershipId };
}
