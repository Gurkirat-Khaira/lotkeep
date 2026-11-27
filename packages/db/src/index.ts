// @dms/db: schema, tenant-scoped app client, RLS helpers.
export { DbError, toDbError } from "./errors";
export { tenantPredicate, tenantRlsSql } from "./rls";
export * from "./schema";
export { normalizeSuite } from "./suite";
// getAppDb is deliberately not exported: handlers must go through withDealer.
export { type AppDb, type AppTx, closeAppDb, initAppDb, withDealer } from "./tenant";
