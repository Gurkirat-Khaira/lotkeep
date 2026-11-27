# packages/compliance: rule engine and CA pack (from Plan 4)

- **Not legal advice.** Every value comes from `docs/research/` with a citation and an effective date. If it isn't in the research, stop and ask the owner.
- Rules are data (`packs/ca/*.yaml`: id, citation, effective_from/to, verified, source_url, values) and code is pure functions that take those values. No magic numbers in TypeScript.
- **CARS Act IDs:** CA-CARS-01…18 (see `docs/research/California CARS Act SB 766.md`). Test names start with the rule ID.
- **Boundaries to always test:**
  - $50,000.00 vs $50,000.01;
  - 400 vs 401 miles;
  - 250 vs 251 miles;
  - restocking minimum and maximum;
  - day 3 on a closed day;
  - check vs immediate payment refund timing;
  - deal language es/zh/tl/vi/ko.
- Money in integer cents, rounded half-up via `percentOfCents`. Time: execution timestamp → the location's IANA zone → calendar days.
- `verified: true` rules are hard stops; `verified: false` rules are warnings the user must acknowledge (audited).
- Use `/new-rule` for every change and run the `compliance-reviewer` agent.
