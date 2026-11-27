# Contributing

Thanks for helping. Please read this page before opening a pull request.

## 1. Sign the CLA
Every outside contribution needs the [Contributor License Agreement](CLA.md) (draft). When you open
a pull request, the CLA bot asks you to sign by posting a comment. It also lets the maintainer
offer the commercial `packages/ee/` edition from the same codebase.

## 2. Synthetic data only, always
This repository must never contain real personal data, in code, tests, fixtures, screenshots,
issues or commit messages:
- no real names, SSNs, driver's license numbers, addresses, phone numbers or VINs tied to people;
- test SSNs start with `000-` or `9`, or are exactly `123-45-6789`;
- test VINs come from `fakeVin()` in `@dms/core`;
- no secrets: `.env` files are git-ignored, and a pre-commit hook runs gitleaks.

## 3. Set up and check
```bash
scripts/setup.sh   # tools, git hooks, dependencies
pnpm verify        # must be green before you push
```
Tests come first (TDD). Rule values (fees, deadlines, legal text) must cite a dated source in
`docs/research/`; never invent or "fix" one in code.

## 4. Commits and pull requests
- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(api): …`, `fix(db): …`,
  `chore: …`, `docs: …`, `test: …`.
- Keep pull requests small and focused. Fill in the pull request checklist.
- Changes to tenancy, auth, crypto, licensing or PII handling get a security review.

## 5. Licensing of your change
Code outside `packages/ee/` is AGPL-3.0. Files inside `packages/ee/` are under the commercial
license and must start with `// SPDX-License-Identifier: LicenseRef-DMS-Commercial`.

## Code of conduct
See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
