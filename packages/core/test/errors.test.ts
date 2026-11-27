import { expect, it } from "vitest";
import { AppError, conflict, forbidden, invalid, notFound, toErrorBody } from "../src/errors";

it("helpers build the right code and status", () => {
  expect(notFound()).toMatchObject({ code: "not_found", status: 404 });
  expect(forbidden("location_forbidden")).toMatchObject({
    code: "location_forbidden",
    status: 403,
  });
  expect(conflict("already_exists")).toMatchObject({ code: "already_exists", status: 409 });
  expect(invalid({ field: "zip" })).toMatchObject({
    code: "invalid_input",
    status: 422,
    details: { field: "zip" },
  });
  expect(notFound()).toBeInstanceOf(AppError);
});

it("codes must be snake_case", () => {
  expect(() => new AppError("NotFound", 404)).toThrow();
});

it("error body is the envelope with requestId and no stack", () => {
  const body = toErrorBody(invalid({ field: "zip" }, "zip is invalid"), "req-1");
  expect(body).toEqual({
    error: "invalid_input",
    message: "zip is invalid",
    details: { field: "zip" },
    requestId: "req-1",
  });
  expect(JSON.stringify(body)).not.toMatch(/stack|at .*\.ts/);
  expect(toErrorBody(notFound(), "req-2")).toEqual({ error: "not_found", requestId: "req-2" });
});

it("error body redacts sensitive keys in details", () => {
  const body = toErrorBody(invalid({ ssn: "000-44-5555", field: "ssn" }), "req-3");
  expect(JSON.stringify(body)).not.toContain("000-44-5555");
  expect(body.details).toEqual({ ssn: "[redacted]", field: "ssn" });
});

it("a 500 never exposes its message", () => {
  const body = toErrorBody(new AppError("internal_error", 500, "db password wrong"), "req-4");
  expect(body).toEqual({ error: "internal_error", requestId: "req-4" });
});
