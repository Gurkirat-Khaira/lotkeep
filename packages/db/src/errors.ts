// Database errors without data. Drizzle's DrizzleQueryError puts the SQL *and its parameter values*
// in `message` and `params`, and Postgres puts values in `detail` and some messages
// (`invalid input syntax for type uuid: "…"`). Anything that may be logged gets a DbError instead,
// which keeps only the SQLSTATE, a fixed description and object names.

import { DrizzleQueryError } from "drizzle-orm/errors";
import pg from "pg";

const DESCRIPTIONS: Record<string, string> = {
  "23505": "unique constraint violation",
  "23503": "foreign key violation",
  "23502": "not-null violation",
  "23514": "check constraint violation",
  "22P02": "invalid input syntax",
  "22001": "value too long",
  "40001": "serialization failure",
  "40P01": "deadlock detected",
  "42501": "insufficient privilege (permission denied or row-level security policy)",
  "57014": "query canceled (statement timeout)",
  "25P03": "idle in transaction timeout",
};

type PgErrorLike = {
  code?: unknown;
  constraint?: unknown;
  table?: unknown;
  column?: unknown;
  schema?: unknown;
};

const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);

export class DbError extends Error {
  override readonly name = "DbError";
  readonly sqlState: string;
  readonly constraint?: string;
  readonly table?: string;
  readonly column?: string;

  constructor(src: PgErrorLike) {
    const sqlState = str(src.code) ?? "XX000";
    const constraint = str(src.constraint);
    const table = str(src.table);
    const column = str(src.column);
    const where = [
      table && `table ${table}`,
      column && `column ${column}`,
      constraint && `constraint ${constraint}`,
    ]
      .filter(Boolean)
      .join(", ");
    super(
      `database error ${sqlState}: ${DESCRIPTIONS[sqlState] ?? "error"}${where ? ` (${where})` : ""}`,
    );
    this.sqlState = sqlState;
    if (constraint) this.constraint = constraint;
    if (table) this.table = table;
    if (column) this.column = column;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      sqlState: this.sqlState,
      constraint: this.constraint,
      table: this.table,
      column: this.column,
    };
  }
}

/** Converts errors from pg/Drizzle into a DbError; anything else passes through unchanged. */
export function toDbError(e: unknown): unknown {
  if (e instanceof DbError) return e;
  // DrizzleQueryError does not set `name`, so check the class.
  if (e instanceof DrizzleQueryError) {
    return new DbError(((e as { cause?: unknown }).cause ?? {}) as PgErrorLike); // pg error in cause
  }
  if (e instanceof pg.DatabaseError) return new DbError(e as PgErrorLike);
  return e;
}
