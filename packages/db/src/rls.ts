// SQL that turns on dealer isolation for one table. Append its output to the generated migration.

const IDENT = /^[a-z_][a-z0-9_]{0,62}$/;

/** The one and only tenant predicate (CLAUDE.md). An unset or '' setting matches no rows. */
export const tenantPredicate = (column: string) =>
  `${column} = NULLIF(current_setting('app.dealer_id', true), '')::uuid`;

/** ENABLE + FORCE row-level security and the tenant policy (USING + WITH CHECK). */
export function tenantRlsSql(table: string, column = "dealer_id"): string {
  if (!IDENT.test(table) || !IDENT.test(column)) {
    throw new Error("tenantRlsSql: table and column must be plain lowercase identifiers");
  }
  const t = `"app"."${table}"`;
  const p = tenantPredicate(column);
  return [
    `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${t} FORCE ROW LEVEL SECURITY;`,
    `CREATE POLICY "${table}_tenant_isolation" ON ${t} USING (${p}) WITH CHECK (${p});`,
  ].join("\n--> statement-breakpoint\n");
}
