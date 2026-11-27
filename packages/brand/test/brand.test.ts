import { expect, it } from "vitest";
import raw from "../../../brand/brand.json" with { type: "json" };
import { brand, loadBrand, parseBrand } from "../src/index";

it("brand.json validates", () => {
  expect(() => loadBrand()).not.toThrow();
});

it("rejects a bad color", () => {
  expect(() => parseBrand({ ...raw, colors: { ...raw.colors, primary: "teal" } })).toThrow();
});

it("exposes the fields the apps read", () => {
  for (const key of ["name", "shortName", "slug", "tagline", "colors", "logo", "github"] as const) {
    expect(brand[key]).toBeTruthy();
  }
});

it("rejects non-https urls such as javascript:", () => {
  expect(() =>
    parseBrand({ ...raw, urls: { ...raw.urls, docs: "javascript:alert(1)" } }),
  ).toThrow();
  expect(() =>
    parseBrand({ ...raw, urls: { ...raw.urls, docs: "http://example.test" } }),
  ).toThrow();
  expect(() =>
    parseBrand({ ...raw, urls: { ...raw.urls, docs: "https://example.test" } }),
  ).not.toThrow();
});

it("rejects markup in the name and CSS in the font", () => {
  expect(() => parseBrand({ ...raw, name: 'X"><script>' })).toThrow();
  expect(() =>
    parseBrand({ ...raw, font: { ...raw.font, family: "x;} body{background:url(//e)}" } }),
  ).toThrow();
});

it("rejects an unknown field so brand.schema.json and the Zod schema stay in sync", () => {
  expect(() => parseBrand({ ...raw, unexpected: true })).toThrow();
});
