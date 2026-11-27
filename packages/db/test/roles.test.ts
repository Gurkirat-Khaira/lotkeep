import { afterAll, describe, expect, it } from "vitest";
import { composePorts, composeServices } from "./helpers/compose";
import { appSql, closePools, ownerSql } from "./helpers/sql";

afterAll(closePools);

describe("database roles", () => {
  it("app role cannot bypass RLS", async () => {
    const r =
      await appSql`select rolbypassrls, rolsuper from pg_roles where rolname = current_user`;
    expect(r[0]).toEqual({ rolbypassrls: false, rolsuper: false });
  });

  it("app role has statement timeout", async () => {
    expect((await appSql`show statement_timeout`)[0]?.statement_timeout).toBe("15s");
  });

  it("app role has idle-in-transaction timeout", async () => {
    expect(
      (await appSql`show idle_in_transaction_session_timeout`)[0]
        ?.idle_in_transaction_session_timeout,
    ).toBe("30s");
  });

  it("app role owns nothing and cannot create databases", async () => {
    const r = await appSql`
      select r.rolcreatedb, r.rolcreaterole,
        (select count(*)::int from pg_namespace n where n.nspowner = r.oid) as schemas,
        (select count(*)::int from pg_class c where c.relowner = r.oid) as relations
      from pg_roles r where r.rolname = current_user`;
    expect(r[0]).toEqual({ rolcreatedb: false, rolcreaterole: false, schemas: 0, relations: 0 });
  });

  it("app role cannot create objects in schema app or public", async () => {
    await expect(appSql`create table app.nope (id int)`).rejects.toThrow(/permission denied/);
    await expect(appSql`create table public.nope (id int)`).rejects.toThrow(/permission denied/);
  });

  it("owner role owns schema app and is not a superuser", async () => {
    const r = await ownerSql`
      select n.nspowner::regrole::text as owner, r.rolsuper, r.rolbypassrls
      from pg_namespace n, pg_roles r
      where n.nspname = 'app' and r.rolname = current_user`;
    expect(r[0]).toEqual({ owner: "dms_owner", rolsuper: false, rolbypassrls: false });
  });

  it("app role gets CRUD on tables the owner creates", async () => {
    await ownerSql`create table if not exists app.role_probe (id int)`;
    try {
      await appSql`insert into app.role_probe values (1)`;
      expect((await appSql`select count(*)::int as n from app.role_probe`)[0]?.n).toBeGreaterThan(
        0,
      );
      await appSql`delete from app.role_probe`;
    } finally {
      await ownerSql`drop table app.role_probe`;
    }
  });

  it("postgres is not exposed beyond localhost", () => {
    const ports = composePorts("postgres");
    expect(ports).toHaveLength(1);
    expect(ports.every((p) => p.startsWith("127.0.0.1:"))).toBe(true);
  });

  it("every service binds published ports to localhost and none uses host networking", () => {
    const all = composeServices();
    expect(all.length).toBeGreaterThan(0);
    for (const [name, svc] of all) {
      expect(svc.network_mode, name).not.toBe("host");
      for (const p of composePorts(name))
        expect(p.startsWith("127.0.0.1:"), `${name} ${p}`).toBe(true);
    }
  });

  it("app role is a member of no role and owns no functions", async () => {
    const r = await appSql`
      select
        (select count(*)::int from pg_auth_members m join pg_roles r on r.oid = m.member
          where r.rolname = current_user) as memberships,
        (select count(*)::int from pg_proc p join pg_roles r on r.oid = p.proowner
          where r.rolname = current_user) as functions`;
    expect(r[0]).toEqual({ memberships: 0, functions: 0 });
  });

  it("app role gets no default EXECUTE on the owner's new functions", async () => {
    await ownerSql`create or replace function app.role_probe_fn() returns int language sql as 'select 1'`;
    try {
      await expect(appSql`select app.role_probe_fn()`).rejects.toThrow(/permission denied/);
    } finally {
      await ownerSql`drop function app.role_probe_fn()`;
    }
  });
});
