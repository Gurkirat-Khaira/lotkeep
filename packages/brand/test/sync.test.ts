import { expect, it } from "vitest";
import { brandCss, manifest, readmeHeader, withHeader } from "../scripts/sync";
import { brand } from "../src/index";

it("brand.css defines the brand tokens", () => {
  const css = brandCss(brand);
  expect(css).toContain(`--brand-primary: ${brand.colors.primary};`);
  expect(css).toContain(`--brand-primary-foreground: ${brand.colors.primaryForeground};`);
});

it("manifest icons point to the SVG with sizes any", () => {
  const m = JSON.parse(manifest(brand));
  expect(m.icons).toEqual([expect.objectContaining({ src: "/favicon.svg", sizes: "any" })]);
  expect(m.name).toBe(brand.name);
});

it("README header block is replaced in place, not duplicated", () => {
  const once = withHeader("# body\n", readmeHeader(brand));
  const twice = withHeader(once, readmeHeader(brand));
  expect(twice).toBe(once);
  expect(twice.match(/brand:start/g)).toHaveLength(1);
});
