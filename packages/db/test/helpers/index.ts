// Test helpers for other packages (import from "@dms/db/testing"). Requires dbTestConfig().
// They open an owner-role pool, so they must never load outside Vitest (repo-hygiene test too).
if (!process.env.VITEST) {
  throw new Error("@dms/db/testing is for tests only (it opens an owner-role connection)");
}

export { appDb, asApp, asOwner, inDealer, openAppDb, ownerDb } from "./db";
export { seedDealer, seedLocation, seedUser } from "./seed";
