# Security policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub Security Advisories:
**[Report a vulnerability](../../security/advisories/new)** (Security tab → "Report a vulnerability").

Include what you found, how to reproduce it, and the impact you expect. Use **synthetic data only**
in reports: never include real customer information.

What to expect:
- an acknowledgement within **3 business days**;
- an initial assessment within **10 business days**;
- coordinated disclosure: we agree on a publication date once a fix is available, and credit you
  if you wish.

## Scope

In scope: this repository's code, including tenant isolation (row-level security), authentication
and MFA, field encryption, the audit log, license-key verification, and PII handling or logging.

Out of scope: deployments run by third parties, social engineering, and denial-of-service by volume.

## Supported versions

The project is in early development (Phase 1) and is **not for production use**. Only the `main`
branch receives fixes.

## Security responsibility

The project's Qualified Individual under the FTC Safeguards Rule (16 CFR 314.4) is
**Gurkirat Singh Khaira** (GitHub `Gurkirat-Khaira`). Self-hosters are responsible for the security of
their own deployments.
