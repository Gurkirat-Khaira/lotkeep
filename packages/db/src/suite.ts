// Suite numbers are stored as entered (suite_raw) and normalized (suite_normalized), so
// "OFC 4", "#4", "Ste 4", "Suite 4" and "Unit 4" all match the same licensed address (spec §5.7).

const DESIGNATORS =
  /\b(?:SUITE|STE|OFFICE|OFC|UNIT|APT|APARTMENT|RM|ROOM|SPACE|SPC|NO|NUMBER|NUM)\b\.?|#/g;

export function normalizeSuite(raw: string): string {
  return raw
    .toUpperCase()
    .replace(DESIGNATORS, " ")
    .replace(/[^A-Z0-9]+/g, "");
}
