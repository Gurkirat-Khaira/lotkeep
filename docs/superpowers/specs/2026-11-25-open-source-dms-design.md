# Open-Source Dealer Management System — Design

**Date:** 2026-11-25
**Owner:** Gurkirat (Kirat) Singh Khaira — github.com/Gurkirat-Khaira
**Working name:** `<PRODUCT_NAME>` (TBD; used below as "the DMS")
**Status:** v5.2 — commands moved to skills (2026-11-27). v5.1 — review fixes 2026-11-27 (entitlements are server-side only; licensing files are Phase 1; section refs). v5 — v4 plus (2026-11-27): CARS Act (SB 766) values settled from the bill text, placeholder brand "Lotkeep" kept in `brand/`, shared kernel and performance/accessibility budgets, and the pre-built Claude Code workspace (CLAUDE.md files, hooks, agents, commands).
**Source research:** `Open source DMS product outline.md` and `NMVTIS and DMS options for dealers.md` (`docs/research/` in the DMS Software folder). The research report is the authority for rule details and citations; this doc decides what gets built and how.

---

## 1. Intent and why

Small independent used car dealers pay $29–$199/month for closed DMS products that update compliance on the vendor's schedule, lock in data, and (CDK 2024) can take thousands of dealers down at once. No maintained open-source DMS exists for US dealers.

The DMS is an open-source, self-hostable dealer management system with a paid hosted tier. Its core value is a **public, dated, cited model of what the law requires**, enforced as gates and clocks in the workflow — not just printable forms.

**Target user:** a small independent California retail used car dealer. The owner studies a **paid commercial DMS** in parallel to learn how a working DMS behaves. This project is **not used for real deals in Phase 1**. It is developed locally, published on GitHub, and modeled on a typical small-dealer workflow (cash and buyer-arranged loans, California, English/Spanish). The repo never names a real dealership or its address.

**Who uses it:** a **dealer** is one legal entity (e.g., a corporation holding a DMV dealer license) that can operate **one or more locations** (main lot plus branches). Dealers and their locations are set up through guided onboarding.

**Where it runs:** the web first (Phase 1). Later, the same app ships as fast native apps for **Windows, macOS, Linux and Android**.

**Why now:** California's CARS Act (SB 766, operative Oct 1, 2026) turned quotes, ads and texts into compliance records and created a 3-day cancellation right that existing small-dealer tools handle inconsistently.

## 2. Goals, non-goals, anti-goals

**Goals**
- Model a California retail used car deal end to end (acquire → list → sell → jacket) with compliance gates, using synthetic data, until it is ready for real use.
- Free AGPL self-host that a small dealer can install from docs.
- A hosted paid tier that funds maintenance.
- Fast, snappy UI: instant navigation, optimistic saves, usable on a phone on the lot.
- One dealer can run multiple locations, each with its own licenses, hours, inventory and staff access.
- Guided **dealer onboarding** and **location onboarding** that collect the legal and compliance setup before any vehicle or deal work.
- One codebase for web (Phase 1) and native apps on Windows, macOS, Linux and Android (Phase 2).
- At public launch, every feature — including paid ones — is free for everyone during a launch promotion; paid features are locked behind a paywall later.
- Rule logic that dealers, attorneys and consultants can audit and fix via pull request.

**Non-goals (for now)**
- Real customer data or live dealership use in Phase 1 (see the production-readiness gate in §6).
- Native desktop/Android apps in Phase 1 (web only; the app is built so it can be wrapped later). iOS is not planned.
- Dealer-arranged financing (credit applications, lender submission, lender RISCs) — later phase.
- Add-on products (service contracts, GAP, etc.) — engine rejects add-ons in Phase 1.
- In-house financing / BHPH servicing (Phase 3, `ee/`).
- Being a DMV First Line Service Provider; transmitting registrations or printing temp plates ourselves.
- Credit bureau pulls, lender submission, e-contracting (partner integrations, Phase 3+).
- States other than California (designed for, not built).
- New-vehicle franchise dealer features.

**Anti-goals (would make it a failure even if it works)**
- Putting security or compliance features (MFA, audit log, encryption, CA rules) behind the paywall — the FTC Safeguards Rule requires them for every dealer.
- Any path where a car can be listed without an NMVTIS report, or a deal delivered without required documents.
- Overwriting or deleting finalized records (violates 13 CCR 272.02).
- Silent cross-dealer data exposure.
- Presenting generated forms as legal advice.
- Ending the launch promotion, or changing what is free, without public advance notice; or ever locking a dealer out of exporting their own records.

## 3. Constraints

- **Legal (California + federal):** NMVTIS gate (VC 11713.26), FTC Used Car Rule Buyer's Guide EN/ES (16 CFR 455), odometer disclosure (49 CFR 580), SB 766 (3-day cancel, total-price ads, first-written-communication archive, add-on rules, translations, 2-yr records), doc fee cap $85/$70 (VC 4456.5), DMV records 3 yr / 90 days onsite / non-alterable / producible in 3 business days (13 CCR 272.00/272.02), FTC Safeguards Rule (16 CFR 314.4), OFAC screening, IRS 8300 for cash >$10,000. Exact figures and citations live in the research report and must be copied into the rule pack with citations.
- **SB 766 settled (research 2026-11-27, `docs/research/California CARS Act SB 766.md`):** 3 **calendar** days starting the day after execution, rolled to the next open day if day 3 is a closed day, ending at close of business; no right if driven **more than 400 miles**; restocking 1.5% of **sale price** ($200–$600, or actual shipping ≤ same cap) + $1/mile over 250 (max $150); refund within 48 h (check: 2 business days after it clears); first-page statement Civ. 1784.43(e) / 2982(r); 36-pt sign VC 11709.2(a); contract must say doc fee is not a governmental fee (2982(n)); no application fee (2982(o)); returned-check fee ≤ $15 (2982(p)); records 2 yr (1784.44) but contracts 7 yr (Civ. 2984.5). Rule IDs CA-CARS-01…18 in that report are the acceptance criteria for Plans 4–5. Still confirm against leginfo chaptered text before the production-readiness gate.
- **Regulated chokepoints:** temp plates / report of sale / registration go only through DMV-contracted FLSPs; NMVTIS reports only from DOJ-approved providers; financing contracts are licensed forms.
- **Team:** solo developer (CS student) at first; **development is done with Claude Code** (see §5.9). Plans, repo layout and docs are written for an AI coding agent to execute.
- **Security owner:** Gurkirat Singh Khaira is the named Qualified Individual (FTC Safeguards Rule) for the project and any deployment he operates.
- **Phase 1 environment:** local development only (Docker Compose on the developer's machine). Synthetic data only — no real PII anywhere in the repo, fixtures, screenshots or local databases.
- **Repository:** public on GitHub from day one under AGPL-3.0; no real-dealer config, names, addresses, keys or data committed.
- **License:** AGPL-3.0 core; commercial license for `packages/ee`.
- **Budget:** near-zero for Phase 1; free tiers and self-hosting.

## 4. Approaches considered

### 4a. License / business model — **picked by owner: AGPL-3.0 core + commercial `ee/`**
| Option | Trade-off |
|---|---|
| **AGPL core + paid `ee/` (chosen)** | Real open source; hosts must share changes, protecting the hosted business. Some companies avoid AGPL. Precedent: Documenso, Formbricks, Twenty. |
| FSL (fair source) | Blocks competing hosts, becomes MIT after 2 yrs; not OSI open source, deters some contributors. |
| MIT | Max adoption; anyone can host it; no protection. |

Free core always includes all compliance and security, one location, unlimited users/vehicles/deals, and data export.

**Where paid code lives (owner decision):** in the **public repo** under `packages/ee/` with a commercial license **from its first commit** (never released under AGPL). Paid features unlock with an **Ed25519-signed license key** verified server-side. A **CLA is required from day one** for all outside contributions (core and `ee/`). Kept private: the license-signing key, billing, hosted-service operations, and any connector whose provider terms forbid publishing code.

**Draft pricing (owner decision: use for now, may change):**
| Plan | Price | Includes |
|---|---|---|
| Community (self-host) | $0 | All compliance, security, export; 1 location; unlimited users, vehicles, deals |
| Hosted Core | $49/mo | Community, hosted and managed |
| Hosted Pro | $99/mo | Hosted Core + all `ee/` features |
| Self-host Pro license | $50/mo | `ee/` features on the dealer's own server |
| Each additional location | +$25/mo | Same on every plan, published |
Annual billing ≈17% off; no contracts; no setup fee. Third-party per-use services (credit, history reports, e-contracts) are bring-your-own-account, or resold per unit at a published price — never bundled into the base price. Main `ee/` value: BHPH servicing; also CRM automation, QuickBooks sync, dashboards, additional locations, SSO/custom roles.

Earlier candidate list for paid features: Candidates for paid (`ee/` + hosting): hosted service, additional locations beyond the first, SSO/SCIM, custom roles, white-label/reseller, partner connectors, licensed contract forms bundle, BHPH servicing, priority support/migration.

**Launch promotion (owner decision):** when the project goes public, **all features, including `ee/` features, are enabled for everyone at no cost**. Paid features are locked later. This is implemented with an entitlement system from day one (§5.8), so ending the promotion is a configuration change, not a code change. The `packages/ee` license must expressly grant free use during the promotion and state how the end is announced.

### 4b. Stack — **builder's call (owner asked for "fast, snappy, modern")**
| Option | Trade-off |
|---|---|
| **Vite + React SPA + Hono API + Drizzle + Postgres (chosen)** | Instant client navigation and optimistic updates; fastest dev loop; biggest contributor pool. Needs a separate site for SEO pages. |
| Next.js full-stack | Great SSR/SEO, big ecosystem; server round-trips make back-office feel slower; more complexity. |
| SvelteKit | Fastest/lightest; smaller contributor and component ecosystem. |

### 4b-2. Native apps (Windows, macOS, Linux, Android) — **builder's call: Tauri 2, Phase 2**
| Option | Trade-off |
|---|---|
| **Tauri 2 wrapping the same React SPA (chosen)** | One codebase; small, fast native binaries (system webview, Rust shell); official Windows/macOS/Linux and Android targets; auto-updater. Needs a Rust toolchain in CI; webview differences must be tested. |
| Electron | Mature, identical Chromium everywhere; large (~100 MB+) and memory-heavy, no Android. |
| Capacitor (mobile) + Electron (desktop) | Two shells to maintain. |
| React Native | Fast native UI on Android, but a second UI codebase. |

The Phase 1 web app is built so it can be wrapped unchanged: client-only SPA (no server rendering), API-first, and all device features (file pick, camera/VIN scan, secure storage, printing) behind a small `packages/platform` interface.

### 4c. Tenancy — **builder's call: shared tables + forced Postgres RLS**
Pool model (`dealer_id` on every row) fits many small tenants. The **dealer (legal entity) is the tenant**; locations live inside a dealer (§5.3), makes single-dealer self-host just "a pool of one". Schema-per-tenant rejected (migration burden for one dev). DB-per-tenant is a later premium option.

## 5. Decisions (the how)

### 5.1 Stack (builder's call)
- **Monorepo:** pnpm workspaces + Turborepo, TypeScript strict everywhere.
- **Web app (`apps/web`):** Vite, React 19, TanStack Router (file-based, typed), TanStack Query (optimistic mutations, cache), Tailwind CSS v4 + shadcn/ui, React Hook Form + Zod. Installable PWA for lot use (VIN barcode scan, photos, check-in), **online-only** in Phase 1 (optimistic updates, no offline store); offline sync is a later decision. Never cache SSNs, credit data or ID images on devices.
- **API (`apps/api`):** Hono on Node 22 LTS, typed RPC client shared with the web app, Zod validation on every input.
- **Worker (`apps/worker`):** pg-boss (Postgres-backed queue — no Redis for self-hosters): PDF rendering, feed generation, retention sweeps, rate-table updates, audit shipping.
- **Database:** PostgreSQL 16+, Drizzle ORM + drizzle-kit migrations.
- **Auth:** Better Auth with mandatory TOTP and passkeys (WebAuthn); session cookies (httpOnly, SameSite=Lax/Strict) on the web. Native apps (Phase 2) use short-lived bearer tokens kept in the OS keychain via `packages/platform`; the API accepts both from day one's design.
- **PDF:** pdf-lib for AcroForm filling (FTC Buyer's Guide EN/ES) and generated docs; PDF/A finalization step.
- **Storage:** S3-compatible API; MinIO (object locking) for self-host, S3 Object Lock for hosted.
- **Testing:** Vitest (unit, rule-pack golden tests), Playwright (E2E), a dedicated cross-tenant RLS leak suite run as the app role.
- **Shared kernel:** `@dms/config` (Zod env, fail fast), `@dms/core` (injected `Clock`, integer-cents `Money`, `AppError` envelope, pino logger with PII redaction, UUIDv7, synthetic `fakeVin`/`fakePerson`), `@dms/contracts` (Zod schemas shared by API and web), `@dms/i18n` (typed EN catalog + ES with per-key fallback from Phase 1; full Spanish UI review in Phase 2), `@dms/brand` (product name, logos and colors from `brand/`).
- **Budgets:** initial web JS ≤ 250 KB gzip, route chunks ≤ 100 KB; API list p95 ≤ 150 ms on seed data; WCAG 2.1 AA (axe in E2E). CI enforces.
- **Tooling:** Biome (lint + format), GitHub Actions CI, CodeQL, dependency + secret scanning, container scan, SBOM, signed images.
- **Distribution:** Docker Compose from Phase 1 for local development (postgres, minio, api, web, worker); published images (GHCR) and one-click Railway/Render/Coolify templates in Phase 2.
- **Native apps (Phase 2):** Tauri 2 shell (`apps/desktop`) wraps the built `apps/web` for Windows, macOS, Linux and Android, with the Tauri updater. Phase 1 code must not call browser-only device APIs directly — only through `packages/platform` (web implementation in Phase 1, Tauri implementation in Phase 2).
- **Public dealer website (later):** separate Astro app consuming the public inventory feed.

### 5.2 Repository layout
```
apps/web              React SPA (desk, inventory, jacket, admin)
apps/api              Hono API
apps/worker           pg-boss jobs
apps/desktop          Tauri 2 shell for Windows/macOS/Linux/Android (Phase 2)
packages/db           Drizzle schema, migrations, tenant-scoped client (sets app.dealer_id)
packages/core         domain: vehicles, deals, customers, state machines
packages/compliance   engine + packs/ca (YAML/JSON rules with effectiveFrom/To + citations) + golden tests
packages/pdf          form maps + filling, generated docs, PDF/A
packages/crypto       encryptField / decryptField / blindIndex; key provider adapters
packages/integrations vPIC, feeds, QuickBooks, Twilio, provider plugin interfaces
packages/ui           shared shadcn components
packages/platform     device features behind one interface (files, camera/VIN scan, secure storage, print); web impl now, Tauri impl later
packages/entitlements feature catalog, plans, launch-promotion switch, server-side checks
packages/ee           commercial license: additional locations, SSO, white-label, partner connectors, BHPH
docker/               compose, images, backup sidecar
docs/                 install, self-host security responsibilities, contributor guide, ADRs (docs/adr/)
CLAUDE.md             instructions for Claude Code (commands, rules, architecture map)
.claude/              Claude Code settings, hooks, subagents and skills (§5.9)
```

### 5.3 Multi-tenancy rules (must not be skipped)
1. Every tenant table has `dealer_id uuid NOT NULL`; indexes lead with it.
2. RLS enabled **and forced**; policy `dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid`.
3. App connects as a non-owner `NOBYPASSRLS` role; migrations run as a separate owner role.
4. Every request runs in a transaction that `set_config('app.dealer_id', …, true)`.
5. UUIDv7 keys; composite FKs on `(dealer_id, id)`.
6. CI leak suite: seed two dealers, assert zero cross-reads/writes for every table and endpoint.
7. **Locations:** the dealer (legal entity) is the tenant. Each dealer has one or more `locations` (main + branches). Location-scoped tables (vehicles, deals, cash drawers, location documents) carry `location_id` with a composite FK `(dealer_id, location_id)`. Users get dealer-wide access (`owner`, `auditor`) or access to listed locations (`membership_locations`). Location access is enforced in the API layer on every location-scoped query and covered by a location-leak test suite; RLS remains the hard boundary between dealers.
8. Requests carry the active location (`X-Location-Id`); the API verifies the user may act there. Reports can span the locations a user can see.

### 5.4 Security baseline (free core, from day one)
- Mandatory MFA for every user; no opt-out.
- Roles: owner/admin, F&I (can reveal PII; every reveal logged), salesperson (masked PII), read-only auditor.
- Field-level envelope encryption (AES-256-GCM; AAD binds dealer/table/column/row) for SSN, DL number, DOB, bank data. **Key hierarchy (builder's call):** master key → per-dealer key → **per-customer data key**, so one customer's PII can be destroyed without touching others. HMAC blind index (per-dealer key) for exact-match lookup. Self-host master key from a mounted secret (Vault/OpenBao optional); hosted uses cloud KMS.
- Finalized documents containing PII are encrypted with the customer's data key before write-once storage. Crypto-shredding runs only when **every** retention clock on that customer's records has expired (legally required records are kept; Safeguards 2-year disposal applies to PII no longer required).
- Append-only, hash-chained audit log (logins, MFA, reveals, exports, edits, document views); alerts on bulk export/reveal spikes.
- Generated data inventory; incident workflow with FTC 30-day / 500-consumer report draft.
- `SECURITY.md`, private vulnerability reporting.

### 5.5 Records (13 CCR 272.02)
- **Signing in Phase 1 (builder's call):** wet ink. The DMS generates the document; staff upload the signed scan. **The signed scan is the legal record**; the generated PDF is kept alongside as the template copy. A document becomes "finalized" (locked) when its signed scan is uploaded and hashed. Delivery gates check for signed scans, not generated PDFs. E-signature (Documenso) arrives in Phase 2.
- Finalized deal documents → PDF/A → write-once object storage (object lock).
- Corrections create linked new versions; nothing overwritten.
- SHA-256 of every document in a per-dealer hash-chained `document_events` ledger.
- Retention engine: each item carries the longest applicable clock (3 yr DMV, 2 yr SB 766, 7 yr contracts/credit docs (Civ. 2984.5); default deal-jacket retention 7 yr); legal hold overrides.
- **DMV inspection export:** ZIP of PDFs + hash manifest for a date range or deal, in minutes.
- Uploaded scans: malware scan, EXIF strip, `dealer_id/location_id/` prefix, short-lived presigned URLs, every download logged.
- The DMV inspection export can be run per location, because each licensed location is inspected and must keep its records available.

### 5.6 Compliance engine
- Rule packs are **data + pure functions**: YAML/JSON rules with `effectiveFrom`/`effectiveTo`, `citation` URL, and status (verified/secondary/unverified).
- Engine evaluates gates (can this car be listed? can this deal be delivered?), fees (doc fee cap, SB 766 restocking `clamp(0.015×price,200,600) + min(max(0,miles−250),150)`), deadlines (3-day cancel window — calendar days from execution with per-location closed-day roll-forward; 48-h refund; 48-h ad takedown), required documents, retention.
- **Gate strictness (builder's call):** rules marked *verified* are hard stops; *secondary/unverified* rules warn and require an acknowledgement recorded in the audit log. Manager override (reason required, audit-logged) exists only for external-provider outages and for clearing an OFAC possible match after review. There is **no override** for listing without an NMVTIS report; the statute's no-record exception is handled by recording a dated attempt that returned no record.
- The **contract date** governs which rule version applies; a deal re-renders under the law in force on that date.
- Golden-file tests: fixture deals → expected document lists, fees, deadlines, filled PDF fields.
- CODEOWNERS per state pack; non-coders can PR rule changes.
- The rule pack applies **per location** (by the location's state), so a future out-of-state branch uses its own pack.

### 5.7 Dealer and location onboarding
Both are guided, resumable wizards with progress saved in `OnboardingProgress`. Until onboarding is complete, inventory and deal screens stay locked for that dealer or location.

**Dealer onboarding (once per legal entity):**
1. Owner account with mandatory MFA.
2. Legal entity: exact registered name (validated against the name typed on licenses), entity type, state entity number, EIN, officers; "no DBA" or DBA list (each DBA requires an FBNS upload).
3. Dealer license: DMV dealer number, license type (retail/wholesale), issue/expiry; surety bond (carrier, bond number, amount, effective date, upload).
4. Security setup: name the Safeguards Qualified Individual; acknowledge the shared-responsibility guide (self-host) — Safeguards program template generated.
5. Defaults: compliance state pack, NMVTIS provider used, FLSP used (drives $85 vs $70 doc-fee cap), document language options (EN/ES in Phase 1).
6. Invite users and assign roles.
7. Create the first location (runs location onboarding).

**Location onboarding (per location):**
1. Location type (main or branch) and address (suite numbering stored as entered, plus a normalized form, so "OFC 4" and "#4" match).
2. Licenses for this location: DMV branch license number (branches), city business license (number, expiry, upload), seller's permit (number, upload), zoning letter, lease.
3. Operations: business hours (must match posted hours), display spaces, sign confirmation photo.
4. Tax jurisdiction and current rate table entry.
5. Print pack: posted notices (SB 766 36-pt notice, inspection notice, etc.) for this location.
6. Assign staff to the location.
7. Readiness checklist: green when required items are present; red items block listing vehicles at this location.

**Ongoing:** expiration reminders at 90/30/7 days for every LicenseDocument (e.g., business license expiring 10/31/2027, bond renewal); an expired required document blocks new deals at that location until renewed (verified-rule hard stop).

### 5.8 Entitlements and the launch promotion
- `packages/entitlements` (AGPL) holds the feature catalog (`core.*` always free; `ee.*` paid), the plan map (`plans.yaml`), Ed25519 license-key verification (public key embedded), and `hasFeature(...)` checked **server-side only**, on every gated route. The UI never decides: it only displays what `GET /entitlements` returns (hides or disables paid screens, shows the promotion banner). With no valid key a dealer is on Community.
- The **additional-locations capability lives in `packages/ee`**: core creates exactly one location; the path that creates more is `ee/` code under the commercial license (a limit written only in AGPL code could legally be deleted).
- **Launch promotion = a free, signed promotion key** granting every `ee.*` feature with `expiresAt` set to the published end date (~6 months after public launch). Hosted applies it automatically; self-host releases ship it. No card, no automatic conversion to paid.
- `core.*` always includes: all compliance and security features, the first location, and full data export. Export can never be gated.
- **Which features are paid, and the promotion's length, are undecided** (pending the owner's market research). The free/paid mapping therefore lives in a config file (`packages/entitlements/plans.yaml`), not in code, so it can be set later without code changes.
- **Promotion terms (owner decision: ~6 months):** fixed end date published at launch together with regular prices (FTC "Free" guide: free offers ≤6 months in any 12). Reminders at **90, 30 and 7 days** (repo notice, in-app banner, email). At the end, accounts drop to Community; data created with paid features becomes read-only and stays exportable; **BHPH loans written during the promotion keep free payment posting for the life of those loans**.
- **Founding dealers:** dealers with real activity during the promotion get ~30% off, locked in writing for 24 months. After that, prices change at most once a year with ≥60 days' notice.
- **Paid plans (Phase 3)** are built to California Automatic Renewal Law and ROSCA standards: clear terms before billing, express consent, online cancellation, renewal/price-change notices. Counsel to confirm whether the CA law applies to business buyers.
- The `packages/ee` license text grants free use during the promotion and points to the notice policy.

### 5.8a Branding (placeholder name)
The working name is **Lotkeep** (placeholder; final name TBD after a trademark/domain check). Name, slug, tagline, colors and logos live only in `brand/brand.json` + `brand/assets/*.svg`; code uses neutral names (`@dms/*`, `DMS_*`, database `dms`) and reads the brand through `@dms/brand`. A repo-hygiene test fails if the brand name appears outside `brand/` and `docs/`. Rebrand = edit `brand.json`, swap SVGs, `pnpm brand:sync`, `gh repo rename` (see `brand/README.md`).

### 5.9 Built with Claude Code
The repository is set up so Claude Code can build and maintain it reliably:
- **`CLAUDE.md`** at the root (kept under ~200 lines): what the product is, the non-negotiable rules (tenancy, MFA, encryption, synthetic data only, no PII in logs, AGPL vs `ee/`), the exact commands (`pnpm dev:up`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm db:migrate`), the repo map, and where specs, plans and ADRs live. Package-level `CLAUDE.md` files (loaded automatically when Claude works in that folder) for `apps/api`, `apps/web`, `packages/db`, `packages/crypto`, `packages/entitlements`, `packages/ee`, `packages/compliance` and `brand/`. These, plus `.claude/`, are written **before** coding starts and are seeded into the repo with `docs/`.
- **`.claude/settings.json`**: permission allowlist for routine commands (pnpm, docker compose, git status/diff/add/commit, gh pr); deny rules for reading `.env*` and secrets; hooks: **SessionStart** prints the active plan's next unchecked task and the latest progress note; **PreToolUse** blocks writes to `.env*`, private keys and `secrets/`, and blocks real-looking SSNs/VINs outside the synthetic patterns; **PostToolUse** runs Biome on edited files; **Stop** runs typecheck + affected tests and sends failures back to Claude.
- **Subagents** (`.claude/agents/`): `security-reviewer` (tenancy, RLS, encryption, MFA, PII logging), `compliance-reviewer` (rule values vs citations in the spec/research), `test-writer` (writes the failing tests first), `ui-reviewer` (bundle budget, accessibility, i18n, wrap-readiness).
- **Skills** (`.claude/skills/<name>/SKILL.md`; Claude Code merged custom commands into skills, and each skill is still run as `/name`): `/new-tenant-table`, `/new-rule`, `/new-api-route`, `/plan-next`, `/handoff` (writes a progress note for the next session), `/verify`. Their descriptions tell Claude when to use them on its own. Each encodes the checklist for that change (RLS + leak-suite registration, citation + golden test, Zod + role + audit).
- **Plans** are written as small, self-contained tasks with exact file paths, exported names, test names and commands, executed with the superpowers subagent-driven-development workflow (one fresh agent per task + review), one commit per task.
- **ADRs** in `docs/adr/` record each significant decision so a fresh session can pick up context without the chat history.

### 5.10 Domain model (Phase 1 core entities)
Dealer (legal name exactly as registered, entity number, EIN, owners/officers), Location (type main/branch, address, DMV dealer/branch license number, city business license number + expiry, CDTFA seller's permit number, business hours, display spaces, FLSP choice, doc-fee setting, tax jurisdiction, posted-notice pack), LicenseDocument (dealer- or location-level: DMV license, bond, seller's permit, business license, zoning letter, lease — with number, issue/expiry dates and file), OnboardingProgress, Entitlement, User, Role/Membership, MembershipLocation, Vehicle (location_id, VIN, decoded specs, stock #, cost basis, title status, odometer in, status), VehicleCost (recon lines), HistoryReport (NMVTIS PDF, provider, pulled_at, brands found), Customer (PII encrypted), Lead/Communication (first-written-communication archive), Deal (location_id; payment type: cash or buyer-arranged loan — the buyer's lender pays the dealer, the dealer does not arrange credit; price, trade-in, fees, taxes, negotiation language EN/ES, status), TradeIn (VIN, odometer in, title status, payoff, allowance; becomes an inventory Vehicle in `acquired`, so the NMVTIS gate applies before resale), DealDocument (versioned, hashed), CancellationEvent, TaxRateTable (dated), RulePack version, AuditEvent, DocumentEvent.

**Vehicle state machine:** acquired → history_attached (requires dated NMVTIS PDF, before any listing) → buyers_guide_ready → listed → pending_sale → sold | wholesaled. Branded result forces warning-label print before `listed`.

**Deal state machine:** draft → quoted (quote archived) → contracted (retail purchase contract with SB 766 first-page notice) → delivered (requires signed scans of: Buyer's Guide, retail purchase contract, odometer statement, SB 766 cancel document if eligible, privacy notice; plus OFAC result) → cancellation_window → closed | cancelled. Cancellation returns the trade-in or pays the greatest of contract value, actual resale price, or fair market value.

## 6. Phased scope

**Phase 1 — MVP on the web, built and tested locally (one dealer with one or more locations, CA, cash + buyer-arranged loans, EN/ES, synthetic data only):**
- Dealer onboarding and location onboarding wizards (§5.7), readiness checklist, license/permit expiry reminders.
- Multiple locations per dealer with location-scoped inventory, deals and staff access.
- Entitlements package with signed license keys (§5.8); no switch: the promotion is itself a signed key.
- Licensing in place from the first commit: AGPL `LICENSE`, `packages/ee/LICENSE` (DRAFT), `CLA.md` + CLA Assistant workflow, `NOTICE-NOT-LEGAL-ADVICE.md` (Plan 1 Task 1).
- `packages/platform` web implementation; no direct device-API calls elsewhere.
- Claude Code workspace: `CLAUDE.md`, `.claude/` settings, hooks, subagents and skills (§5.9).
- Inventory: vPIC decode, stock #, cost basis, title/odometer in, NMVTIS PDF upload gate (dated), CA warning-label print for branded results; recon cost lines.
- Trade-ins: intake (VIN decode, odometer, title status, payoff, allowance) feeding inventory.
- Pricing: total-price calculator (VC 11713.1(e) exclusions).
- Documents: Buyer's Guide EN/ES (FTC fillable PDFs); retail purchase contract with SB 766 first-page notice; SB 766 3-Day Right to Cancel document and 36-pt posted notice (EN/ES); odometer disclosure; privacy notice; signed-scan upload and finalization.
- Desking: cash and buyer-arranged-loan deals; dated city/county tax table with manual override (e.g. a city rate of 8.75% vs 7.75% in the surrounding county, as of 10/1/2026); doc-fee cap $85/$70; add-ons rejected.
- Compliance engine (CA pack v0): SB 766 eligibility, cancellation deadline (calendar days, closed-day roll-forward, per-location hours/closures), restocking fee, 48-h refund timer, trade-in return valuation; odometer requirement; OFAC SDN screen; IRS 8300 cash alert; deals in Chinese/Korean/Tagalog/Vietnamese blocked until Phase 2.
- Communications: first-written-communication log (manual paste or screenshot upload); 48-h takedown reminders for manually posted ads.
- DMV handoff: eROS worksheet export; TLP number and deadline alerts.
- Records: write-once jacket (MinIO object lock locally), hash ledger, retention timers, legal hold, DMV inspection export.
- Merchandising: generic CSV feed with timestamped sold-unit removal.
- Reporting: days on lot, gross per deal, cancellations, compliance exceptions.
- Platform: full security baseline (§5.4), RLS with leak suite, Docker Compose dev environment, CI.

*Exit (learning-mode, no real data):*
- 10 synthetic deal scenarios, modeled on deals observed in the paid DMS (with all PII replaced), produce the same documents, fees, taxes and deadlines the paid system would.
- Mock DMV inspection export runs in under an hour.
- Cross-tenant and cross-location leak suites and golden tests green in CI.
- A synthetic dealer with two locations onboards end to end; staff assigned to one location cannot see or act on the other.
- Draft written Safeguards program naming Gurkirat Singh Khaira as Qualified Individual.

**Production-readiness gate (before any real customer data):** chosen hosting; encrypted off-site backups with a tested restore; master-key custody and backup; object-lock storage; vulnerability scan; Safeguards program finalized; SB 766 statute wording confirmed; parallel run against the paid DMS.

**Phase 2 — public release and native apps:** launch promotion live (every feature, including `ee/`, free for all); Tauri 2 apps for Windows, macOS, Linux and Android (`apps/desktop`) with signed builds and auto-update; attorney-reviewed final `ee/` license and CLA (drafts exist since Phase 1), final product name + trademark policy; Docker Compose + backup/restore; CA pack as cited data + golden tests + contributor guide; Meta + Google vehicle feeds (48-h removal); QuickBooks Online + Twilio on dealer's own credentials with TCPA consent ledger; VIN/history provider plugin (VinAudit); self-hosted Documenso for non-contract signatures; 5-language SB 766 translations; bring-your-own RISC template slot; Spanish UI; Safeguards templates for self-hosters.
*Exit:* an outside dealer installs unaided; a non-founder lands a rule-pack change; the app installs and runs a full deal on Windows, macOS, Linux and an Android tablet.

**Phase 3 — hosted paid tier:** managed Postgres pool, per-dealer KMS keys, Object Lock, backups with restore drills, pen test + scans, billing, ToS with offboarding export guarantee; paywall switched on after the promotion ends (≥90 days' notice); `ee/`: additional locations, SSO/SCIM, white-label, BHPH servicing; partner integrations (700Credit, AutoCheck Fast Link, one FLSP import, licensed RISC bundle); SOC 2 path.

## 7. Calls made by the builder (owner to review)
- Stack: Vite + React SPA, Hono API, Drizzle, Postgres, Better Auth, pg-boss (owner confirmed).
- Tenancy: shared tables + forced RLS.
- Trade-ins included in Phase 1 (owner left this to the builder): common in used-car sales and needed for correct SB 766 cancellation handling.
- Lot PWA is online-only in Phase 1.
- Wet-ink signatures with signed scans as the legal record in Phase 1.
- Gate strictness and override policy (§5.6).
- Per-customer data keys for crypto-shredding (§5.4).
- Tax: city/county table with manual override; contract date governs rule versions.
- Repo public from day one; CLA in place before the first outside contribution.
- First written communications captured manually in Phase 1.
- Native apps via Tauri 2 (Phase 2); web app kept wrap-ready through `packages/platform`; iOS not planned.
- Location isolation enforced in the API layer with its own leak suite; RLS stays the dealer boundary.
- Additional-location capability implemented inside `ee/`; extra locations +$25/mo under the draft pricing.
- CLA tooling: CLA Assistant Lite GitHub Action with `CLA.md` from the first commit.
- Promotion end needs ≥90 days' public notice; data export is never paywalled.
- Onboarding blocks inventory/deals until required setup is complete; expired required documents block new deals at that location.
- Claude Code workspace conventions (§5.9).

## 7b. Left to the builder
- Exact table/column design within the entities above; API route shapes.
- UI layout and component choices within shadcn/ui.
- Choice of PDF/A tooling, malware scanner, and HMAC/KMS libraries that meet 5.4.
- Seed/fixture data (synthetic only — never real PII in repo or tests).
- Business-hours calendar implementation for deadline computation.

## 8. Open items (owner / legal)
- Product name and GitHub org/repo name.
- ~~Read SB 766 statute text~~ done 2026-11-27 via CalMatters bill text; re-confirm on leginfo before the production-readiness gate.
- Confirm federal retention figures marked unverified in the research (Reg B, odometer 5 yr, 8300).
- Which FLSP the first real dealer will use (determines eROS export format) and which paid DMS the owner studies.
- When to pass the production-readiness gate.
- Pricing is a working draft (may change after testing with founding dealers).
- Exact promotion end date (set at public launch, ~6 months out).
- Attorney review of the `ee/` license, CLA and (Phase 3) terms of service before public launch.
