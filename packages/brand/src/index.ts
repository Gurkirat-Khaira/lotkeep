// @dms/brand: the only way code reads the product name, logos and colors.
// Source of truth: brand/brand.json (+ brand/assets/*.svg). brand.schema.json is editor hints only;
// this Zod schema is the real validator. Add a field to both.
import { z } from "zod";
import raw from "../../../brand/brand.json" with { type: "json" };

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "expected a #RRGGBB color");
const assetPath = z.string().regex(/^assets\/[\w.-]+\.svg$/, "expected assets/<file>.svg");
// https only: these become links in the UI, so javascript:/data:/http: are rejected.
const urlOrEmpty = z.union([z.literal(""), z.url({ protocol: /^https$/ })]);
// Brand text is rendered into HTML/CSS by brand:sync and the web app: no markup characters.
const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[^<>"'`&\\{};]+$/, "no markup or CSS characters");
const cssFont = z.string().regex(/^[\w ,-]+$/, "letters, digits, spaces, commas and dashes only");
const emailOrEmpty = z.union([z.literal(""), z.email()]);

export const brandSchema = z.strictObject({
  $schema: z.string().optional(),
  status: z.enum(["placeholder", "final"]),
  name: text(40).min(2),
  shortName: text(20).min(2),
  slug: z.string().regex(/^[a-z][a-z0-9-]{1,38}$/),
  tagline: text(120),
  description: text(300),
  owner: text(100),
  github: z.strictObject({
    owner: z.string().regex(/^[A-Za-z0-9-]+$/),
    repo: z.string().regex(/^[A-Za-z0-9._-]+$/),
  }),
  urls: z.strictObject({ website: urlOrEmpty, docs: urlOrEmpty, support: urlOrEmpty }),
  emails: z.strictObject({ support: emailOrEmpty, security: emailOrEmpty }),
  colors: z.strictObject({
    primary: hex,
    primaryForeground: hex,
    accent: hex,
    ink: hex,
    paper: hex,
  }),
  font: z.strictObject({ family: cssFont, fallback: cssFont }),
  logo: z.strictObject({
    mark: assetPath,
    markMono: assetPath,
    wordmark: assetPath,
    wordmarkDark: assetPath,
    favicon: assetPath,
  }),
});

export type Brand = z.infer<typeof brandSchema>;

/** Validates any brand-shaped value. Throws a ZodError listing the bad fields. */
export const parseBrand = (input: unknown): Brand => brandSchema.parse(input);

/** Validates the repo's brand/brand.json. */
export const loadBrand = (): Brand => parseBrand(raw);

export const brand: Brand = loadBrand();
