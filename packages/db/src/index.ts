// @dms/db: schema, tenant-scoped app client, RLS helpers.
export { type CatalogReport, checkCatalog, SECURITY_DEFINER_ALLOWLIST } from "./catalog";
export { DbError, toDbError } from "./errors";
export {
  GLOBAL_TABLES,
  listLocationTables,
  listTenantTables,
  ROOT_TABLE,
  registerLocationTable,
  registerTenantTable,
  type Sample,
  type SampleContext,
  type TenantTableEntry,
} from "./registry";
export { tenantPredicate, tenantRlsSql } from "./rls";
export * from "./schema";
export { normalizeSuite } from "./suite";
// getAppDb is deliberately not exported: handlers must go through withDealer.
export { type AppDb, type AppTx, closeAppDb, initAppDb, withDealer } from "./tenant";

import "./tenant-tables"; // registers the leak-suite tables
