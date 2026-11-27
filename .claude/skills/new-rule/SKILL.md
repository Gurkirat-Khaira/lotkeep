---
name: new-rule
description: "Use whenever adding or changing a compliance rule, fee, deadline or legal text: copy the cited value from docs/research, rule-pack entry, pure function, golden tests."
argument-hint: "<rule id e.g. CA-CARS-05> <short description>"
---
Rule: $ARGUMENTS

1. Find the rule in `docs/research/` (for CARS: `California CARS Act SB 766.md`). Copy the exact values and the citation. If the research doesn't have it, **stop and ask the owner**; never guess.
2. Add a rule-pack entry (`packages/compliance/packs/ca/*.yaml`) with `id`, `citation`, `effective_from`, optional `effective_to`, `verified: true|false`, `source_url`, and the values in integer cents, basis points, days or miles.
3. Implement it as a pure function in `packages/compliance/src/` that takes the pack values (no hard-coded numbers) and a `Clock` or zone when time matters.
4. Write golden tests named `<RULE-ID> <case>`, covering each boundary (for example exactly at the limit, one over, a closed day, the time-zone edge).
5. Run the `compliance-reviewer` agent. Commit with `feat(compliance): <RULE-ID> …`.
