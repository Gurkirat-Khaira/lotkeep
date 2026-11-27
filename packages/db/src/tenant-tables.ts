// Leak-suite registrations. Add every new tenant table here (parents before children), with a
// synthetic sample row. See /new-tenant-table.
import { newId } from "@dms/core";
import { registerLocationTable, registerTenantTable } from "./registry";
import { dataKeys, locations, membershipLocations, memberships } from "./schema";

registerTenantTable(locations, (dealerId) => ({
  dealerId,
  id: newId(),
  name: "Leak Test Lot",
  kind: "branch",
  addressLine1: "1 Example Ave",
  city: "Testville",
  state: "CA",
  zip: "90000",
}));

registerTenantTable(memberships, (dealerId, _locationId, ctx) => ({
  dealerId,
  id: newId(),
  userId: ctx.userId,
  role: "sales",
}));

registerLocationTable(membershipLocations, (dealerId, locationId, ctx) => ({
  dealerId,
  membershipId: ctx.ref(memberships).id,
  locationId,
}));

registerTenantTable(dataKeys, (dealerId) => ({
  dealerId,
  id: newId(),
  scope: "customer",
  subjectId: newId(),
  keyVersion: 1,
  wrappedKey: Buffer.from("not-a-real-wrapped-key"),
}));
