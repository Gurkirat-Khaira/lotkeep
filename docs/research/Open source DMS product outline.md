# Open-source the DMS, sell compliant hosting

An open-source Dealer Management System for small California used-car dealers can be built, and nobody else is building one. Almost all of its value is compliance work, not inventory screens. It needs five things. First, a gate that keeps any car off the lot until an NMVTIS report is attached. Second, an FTC Buyer's Guide in the exact required format. Third, the SB 766 engine (three-day cancellation, total-price advertising and add-on disclosures), operative **October 1, 2026**. Fourth, the **$85 doc-fee cap**. Fifth, a deal jacket that cannot be altered and that can be handed to DMV on **three business days' notice**. The recommended business model is an **AGPL-3.0 core on GitHub** in which every compliance and security control is free, plus a small commercially licensed `ee/` folder. Revenue comes from a hosted tier at roughly **$49 per rooftop per month**. That is below DealerCenter's $99 core and Frazer's $199 hosted plan and above DealerVLO's $29. Setup, data migration and partner integrations are sold on top. The FTC Safeguards Rule should shape the architecture itself, not sit on a feature list. MFA is mandatory. Sensitive fields are encrypted with per-dealer keys. The audit log is append-only. A retention engine reconciles the Rule's duty to dispose of data two years after last use with California's 3-year DMV retention and 7-year finance-contract retention. Three functions stay with outside regulated providers in every phase: temporary plates and electronic reports of sale (only DMV-contracted First Line Service Providers can do them), credit pulls (the dealer's own bureau credentials) and retail installment contract forms (licensed suppliers or lenders). Year one integrates only services with open, self-serve access: NHTSA's free VIN decoder, Meta and Google inventory feeds, QuickBooks, Twilio and uploaded NMVTIS reports. The roadmap has three phases. Phase 1 is a single-tenant MVP that handles a first dealer's retail deals while a cheap commercial DMS runs alongside as a safety net. Phase 2 is a public GitHub release with Docker self-hosting and data-driven California rule packs. Phase 3 is a multi-tenant hosted paid tier. Several federal finance-rule figures below (Reg B, Reg Z, TCPA, Form 8300, odometer retention) were located at their primary sources but not read during this research. They are marked **unverified** and should be confirmed before they become hard-coded rules.

A note on labels: **Verified** means the cited page was read. **Secondary** means the figure comes from a reputable summary, such as a dealer-training site or law-firm alert, rather than the statute. **Unverified** means the primary-source location is known but its text was not read.

## No open-source DMS exists, so the license is the first and most permanent decision

### The niche is empty because earlier projects skipped the hard parts

Nobody maintains a credible open-source DMS for US used-car dealers. GitHub's "car-dealership" topic holds 77 repositories. The most-starred has **87 stars and was last updated in November 2022**, and most of the rest are coursework with no releases or CI ([GitHub topic](https://github.com/topics/car-dealership?o=desc&s=forks)). SourceForge's "auto-dms" has been in "Planning" status since **May 2014** ([SourceForge](https://sourceforge.net/projects/auto-dms/)). Directory pages titled "open source car dealer software" list proprietary products such as vAuto, RouteOne and AutoFi ([Fitgap](https://us.fitgap.com/search/car-dealer-software/open-source?page=1)). No project left a post-mortem. The likely reasons they stalled are consistent, though this is inference. None had a real dealer as a user. None handled state forms, eROS or Buyer's Guides, which are the hard and valuable parts. None had a hosted offering to pay for maintenance. A real dealer as "customer zero" fixes the first of these, and the design below targets the other two.

The commercial market shows where the value sits. Frazer bundles inventory, lender submission, 700Credit pulls, TILA/Reg Z support, OFAC checks, Buyer's Guide and IRS 8300 printing, BHPH, full accounting and CRM for **$129/month on desktop or from $199/month hosted**. DealerCenter unbundles the same scope. Its **$99 core** covers inventory, VIN decode and desking. BHPH is +$50, accounting +$99, recon +$99 and CRM $99–$199. Pay-per-use items include **NMVTIS at $0.25 per report**, eContracts at $3 and deal printing at $5 ([rfp.wiki comparison](https://www.rfp.wiki/specialty-industries/dealer-management-systems/frazer/dealercenter)). DealerVLO, at **$29/month**, was the only vendor found that documents SB 766 support in detail. Even DealerVLO does not produce a California finance contract or track refund timing ([DealerVLO](https://www.dealervlo.com/blog/california-cars-act-dealer-compliance-2026)). An open-source entrant therefore competes on transparency, cost and compliance depth, not on breadth of features.

### AGPL-3.0 with an `ee/` folder is the right license; FSL is the honest alternative

There are three real options. The most common open-core pattern in 2024–2026 is an **AGPL-3.0 core plus a separately licensed enterprise folder** unlocked by a license key. Documenso, Formbricks, Twenty and Plausible all use it. Formbricks keeps enterprise code in `/apps/web/modules/ee`, ships it in the same Docker image, and requires anyone who modifies and distributes the core to "publish your complete code under the AGPLv3" ([Formbricks](https://formbricks.com/docs/self-hosting/advanced/license); [Documenso](https://docs.documenso.com/docs/policies/licenses)). The second option is a source-available license. Sentry's Functional Source License bars competing commercial use and converts to open source after **2 years**, against BUSL's default of 4 ([TechCrunch](https://techcrunch.com/2024/09/22/some-startups-are-going-fair-source-to-avoid-the-pitfalls-of-open-source-licensing/)). n8n's Sustainable Use License forbids hosting the software for others ([Activepieces](https://www.activepieces.com/blog/n8n-license-fair-code-community-enterprise-2026)). The third option, MIT or Apache, maximizes adoption and protects nothing.

The decisive lesson concerns timing, not which license wins. HashiCorp's 2023 move to BSL produced the OpenTofu fork within about a month, and the fork reached **22,400 stars**. It also left what one consultancy CEO called a "sense of betrayal", even though revenue kept growing 15% year over year ([TechTarget](https://www.techtarget.com/it-infrastructure/news/366610212/OpenTofu-OpenBao-reach-milestones-post-HashiCorp-BSL)). Akaunting, a small-business accounting tool and the closest analog to a dealer DMS, moved to BSL in 2023 to stop "competitors repackaging" its work and replaced its free cloud with a **$12/month** plan ([Akaunting](https://akaunting.com/blog/akaunting-3-1-speed-licensing-and-plans)). On April 15, 2026, Cal.com took its commercial code closed-source. It cited AI-assisted vulnerability discovery and relaunched its community edition as MIT-licensed "Cal.diy" ([Cal.com](https://cal.com/blog/calcom-v6-4)). Critics dispute that security argument ([The Register](https://www.theregister.com/security/2026/04/26/ais-not-going-to-kill-open-source-code-security/5220745)). Choose the license once, at launch.

The recommendation is **AGPL-3.0 for the core**. The realistic competitive threat is an existing DMS vendor or a local IT reseller hosting the code for dealers, not AWS. AGPL does not stop that, but it forces such a host to publish its changes, and the project would absorb them. FSL would stop it outright. The cost is that the project could no longer call itself open source. An OSI board member says fair-source licenses "are not open source licenses" ([TechCrunch](https://techcrunch.com/2024/09/22/some-startups-are-going-fair-source-to-avoid-the-pitfalls-of-open-source-licensing/)), and the "open source" label is this project's main way to attract contributors. Four safeguards complete the setup:

1. **Trademark.** Publish a trademark policy, as ERPNext does alongside its GPL-3.0 code, so forks cannot trade on the name ([GitHub frappe/erpnext](https://github.com/frappe/erpnext)).
2. **Contributor agreement.** While the founder owns all the code, the founder can dual-license it. Once outside contributions arrive, preserving that option takes a CLA. A DCO adds less friction but grants no relicensing rights ([Linux Foundation](https://bestpractices.linuxfoundation.org/ip/contribution-mechanisms-cla.html)). Adopt a lightweight CLA before the first external pull request.
3. **Disclaimers.** In the README and the app, state that forms are templates, not legal advice. Date the version of every template. Cal.com's community edition carries comparable "at their own risk" language ([Cal.com](https://cal.com/blog/calcom-v6-4)).
4. **Hosted terms.** Put the hosted service under its own terms of service with a limitation of liability. No case was found of an open-source maintainer being held liable for a compliance error in generated forms, so this is caution, not documented precedent.

### The paid line sits above compliance, not inside it

Comparable projects draw the free/paid line in the same places: SSO, audit logs, granular roles, multiple workspaces, white-labeling, support SLAs and hosted convenience ([Twenty](https://docs.twenty.com/user-guide/billing/capabilities/pricing-plans); [Formbricks](https://formbricks.com/docs/self-hosting/advanced/license); [Plausible](https://plausible.io/self-hosted-web-analytics)). A DMS must break with two of those habits. Formbricks keeps 2FA in its enterprise tier, and Cal.com moved **booking audit logging** into its private enterprise code ([Cal.com Cal.diy](https://cal.com/blog/cal-diy-open-source-to-closed-source)). The Safeguards Rule, however, requires every covered dealer to use MFA for "any individual accessing any information system" and to "monitor and log the activity of authorized users" ([16 CFR 314.4](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314/section-314.4)). Putting these behind a paywall would ship a product that is unsafe by default, so they stay free.

| Capability | Free AGPL core | Paid (`ee/` license or hosted) | Rationale |
|---|---|---|---|
| Inventory, desking, deal jacket, CRM log, reporting for one rooftop | Yes | — | Core workflow; drives adoption |
| California rule pack (Buyer's Guide, NMVTIS gate, SB 766, doc fee, retention) | Yes, as open data with citations | Hosted applies updates automatically on the effective date | Free compliance is the brand promise. Paid value is not having to upgrade on time yourself |
| MFA, default least-privilege roles, audit log, field encryption, retention/disposal | Yes | — | Safeguards §314.4(c) applies to every covered dealer |
| Multi-rooftop or dealer-group consolidation | No | Yes | Same line Twenty and Formbricks draw |
| SSO (OIDC/SAML), SCIM, custom roles | No | Yes | Matters only to larger groups |
| White-label and reseller rights | No | Yes | Formbricks sells white-labeling ([Formbricks](https://formbricks.com/docs/self-hosting/advanced/license)) |
| Licensed third-party forms (e.g., RISC forms) | Bring-your-own template slot | Hosted bundle via forms-supplier agreement | Licensed forms cannot be published in a public repo |
| Partner integrations with revenue share or per-transaction fees (700Credit, AutoCheck, FLSP import) | Plugin interface only | Yes | Need commercial agreements held by a legal entity |
| BHPH servicing (amortization, collections, Metro 2) | Candidate for `ee/` | Yes | DealerCenter charges +$50/month for this; it is a distinct segment |
| Managed backups, Object Lock storage, uptime, priority support, migration | Docs and scripts | Yes | Plausible: cloud gets security fixes immediately; self-hosters only after they upgrade ([Plausible](https://plausible.io/self-hosted-web-analytics)) |

### Hosting pays for the project; dealer software prices set the ceiling

Hosted SaaS is the proven way small open-source tools fund themselves. Plausible calls cloud subscriptions its "only funding source" and says it offers free self-hosting on principle, "not because it is good business" ([Plausible](https://plausible.io/self-hosted-web-analytics)). ERPNext charges no license fee and earns from Frappe Cloud hosting at **$25–$200/month** ([Fujigo](https://fujigo-soft.com/en/2026/02/04/erpnext-vs-odoo/)). The table puts those benchmarks next to dealer-software prices.

| Product | Model | Published price |
|---|---|---|
| Akaunting (BSL) | Self-host free for one-person businesses; paid cloud | $12/month or $96/year ([Akaunting](https://akaunting.com/blog/akaunting-3-1-speed-licensing-and-plans)) |
| n8n (Sustainable Use) | Free self-host; cloud tiers | $20 / $50 / $800 per month ([Activepieces](https://www.activepieces.com/blog/n8n-license-fair-code-community-enterprise-2026)) |
| Frappe Cloud (ERPNext, GPL-3.0) | Hosting and support only | $25 / $50 / $100 / $200 per month ([Fujigo](https://fujigo-soft.com/en/2026/02/04/erpnext-vs-odoo/)) |
| Odoo Enterprise | Proprietary layer on LGPL Community | ~$31/user/month for 1–10 users ([Fujigo](https://fujigo-soft.com/en/2026/02/04/erpnext-vs-odoo/)) |
| DealerVLO | Proprietary SaaS | $29/month ([DealerVLO](https://www.dealervlo.com/blog/california-cars-act-dealer-compliance-2026)) |
| GARAGEBIRDS | Freemium | Free plan; Pro $49–$59/month ([GARAGEBIRDS](https://garagebirds.com/cheapest-dealer-management-software.html)) |
| Wayne Reaves | Proprietary | $75 cash-only to $145 with BHPH ([DealersCloud compare](https://www.dealerscloud.com/compare)) |
| DealerCenter | Modular | $99 core plus $50–$199 modules plus per-use fees ([rfp.wiki](https://www.rfp.wiki/specialty-industries/dealer-management-systems/frazer/dealercenter)) |
| Frazer | Bundled | $129 desktop, $199 hosted, $1,299/year ([rfp.wiki](https://www.rfp.wiki/specialty-industries/dealer-management-systems/frazer/dealercenter)) |

The revenue sources, in order of feasibility for a solo founder:

1. Hosted subscriptions per rooftop.
2. Paid setup, migration from spreadsheets or another DMS, and support.
3. Paid integrations through partner programs.
4. Per-transaction fees on e-sign, e-contracting or credit pulls, once partner agreements exist.
5. A subscription for licensed forms content.

Pricing is an inference, since no open-source DMS publishes prices to compare against. A **$49/month hosted core** with unlimited users undercuts DealerCenter's real bill once modules are added. Reviewers specifically complain about its "hidden charges" ([Capterra](https://www.capterra.com/p/71935/DealerCenter/pricing/)). A **~$99/month "Plus" tier** with BHPH servicing and multi-rooftop matches Frazer's all-in pitch. Undercutting DealerVLO's $29 is unnecessary, because the hosted tier adds immutable records storage and Safeguards documentation that DealerVLO does not advertise. No conversion data from self-hosters to paid plans was found for any comparable project.

## Fifteen modules, each tied to the rule it enforces

Vendor feature lists converge on the same core: inventory with VIN decode, desking, forms, lender submission and reporting. They differ only in whether BHPH, accounting, CRM and recon are bundled (Frazer) or sold separately (DealerCenter) ([rfp.wiki](https://www.rfp.wiki/specialty-industries/dealer-management-systems/frazer/dealercenter)). An open-source DMS needs those thirteen functional areas plus two cross-cutting ones, a compliance engine and a records system. Each module below lists the rule that makes it necessary, because that link decides what can be deferred.

| # | Module | Must do | Rules that drive it |
|---|---|---|---|
| 1 | Inventory and acquisition | VIN decode, stock number, cost basis, purchase source, title status, odometer received, photos. Status workflow: acquired, then NMVTIS attached, then Buyer's Guide printed, then listed | VC 11713.26 NMVTIS gate; 49 CFR 580 odometer; 13 CCR 272 records |
| 2 | Reconditioning | Repair orders; parts and labor added to cost; vendor payables | Accounting accuracy; SB 766 "installed items" must be in the advertised price |
| 3 | Pricing and valuation | Retail price; total-price calculator that excludes only permitted items; valuation-guide hooks | SB 766 total-price rule; VC 11713.1(e) |
| 4 | Merchandising and syndication | Hosted feed per dealer (Meta, Google, generic CSV); sold units removed within 48 hours | SB 766 48-hour ad withdrawal (VC 11713(c)); 2-year ad retention |
| 5 | CRM and communications log | Leads; SMS/email with consent ledger; archive of every first written communication | SB 766 first-written-communication rule; TCPA |
| 6 | Desking | Cash, outside-finance and BHPH structures; payment quotes that auto-append total of payments and the lower-payment warning; tax by buyer address; doc-fee cap | SB 766 payment-quote rules; VC 4456.5; CDTFA district tax |
| 7 | F&I and credit | Credit application packet; OFAC screen; ID and Red Flags check; add-on menu with "not required" disclosures and blocking of prohibited products; adverse action tracking | SB 766 add-ons; Civ. Code 2982.2; FCRA; Reg B; Red Flags; OFAC |
| 8 | Forms and document engine | Fill official PDFs (FTC Buyer's Guide EN/ES); render generated documents; bring-your-own licensed RISC templates; five-language SB 766 translations; signatures | 16 CFR 455; SB 766; Civ. Code 1632; ASFA |
| 9 | DMV, title and registration handoff | eROS/registration worksheet and export for the dealer's FLSP; record TLP number; track deadlines | AB 516 / VC 4456, 4456.2; OLIN 2024-07 |
| 10 | Accounting | Per-vehicle P&L, GL export, floor plan, add-on provider payables due within 10 days, QuickBooks sync | SB 766 10-day add-on payment; CDTFA records |
| 11 | BHPH servicing | Amortization, APR and finance charge for the TILA box, payment posting, late fees, collections, repossession notices, 8300 aggregation, Metro 2 | Reg Z; ASFA; Red Flags; FCRA furnishing; IRS 8300 |
| 12 | Compliance engine | Versioned state rule packs (eligibility, fees, deadlines, required documents, retention) with effective dates and citations | All of the above |
| 13 | Deal jacket and records | Write-once documents, hash ledger, retention timers, legal hold, DMV inspection export | 13 CCR 272.02; Safeguards disposal; SB 766 2-year rule |
| 14 | Reporting | Days on lot, gross per deal, cancellation log, compliance exceptions, Safeguards access reviews | Safeguards periodic access review; SB 766 |
| 15 | Platform and security | Tenancy, MFA, roles, PII reveal controls, audit log, encryption, incident workflow, admin | 16 CFR 314.4 |

Two design choices follow from this table. First, **inventory and deal records should be state machines with compliance gates, not free-form records**. A car cannot reach "listed" until a dated NMVTIS report is attached, and a deal cannot reach "delivered" until the SB 766 documents, Buyer's Guide and odometer statement exist in the jacket. Second, the forms engine and compliance logic should be **per-state rule packs**. The vendors themselves sell state forms programming as a separate product ([rfp.wiki](https://www.rfp.wiki/specialty-industries/dealer-management-systems/frazer/dealercenter)), and expanding to a second state should mean adding data, not forking code.

## Federal rules set the floor; SB 766 changed California deals on October 1, 2026

### The federal layer: one verified core, many finance rules still to confirm

The FTC's CARS Rule should not be implemented as federal law. The Fifth Circuit **vacated it on January 27, 2025** for procedural defects ([Fifth Circuit opinion](https://www.ca5.uscourts.gov/Opinions/pub/24/24-60013-CV0.pdf); [Holland & Knight](https://hklaw.com/en/insights/publications/2025/02/fifth-circuit-strikes-down-ftcs-auto-retail-scam-rule)). The FTC can still pursue the same practices under Section 5 ([Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2025/03/a-post-cars-rule-brake-not-so-fast-buckle-up-for-new-regulatory-activity-in-the-motor-vehicle-space)). Its concepts reach a California dealer through SB 766 instead.

The Safeguards Rule's reach depends on how the dealer sells. The FTC's 2025 dealer FAQ says it covers dealers that finance, or arrange or broker financing, and leases longer than 90 days. **Cash-only sales are generally outside it** ([FTC Safeguards FAQ for Auto Dealers](https://www.ftc.gov/system/files/ftc_gov/pdf/2025-GLB-Safeguards-FAQs-for-Auto-dealers.pdf)). Because the first dealer will take credit applications for outside lenders, the product should assume coverage from day one.

| Rule | Exact requirement | What the DMS enforces | Status |
|---|---|---|---|
| FTC Used Car Rule, 16 CFR 455 | Applies to anyone selling after 5+ used-vehicle sales or offers in the prior 12 months. Covers vehicles (not motorcycles) with GVWR <8,500 lb, curb weight <6,000 lb and frontal area <46 sq ft. Guide printed in 100% black ink on white stock at least 11" x 7¼", with the Rule's exact wording. Spanish guide and contract disclosure if the sale is conducted in Spanish. Every contract must say "The information you see on the window form for this vehicle is part of this contract." ([eCFR](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-455)) | Fill the FTC's official fillable PDF (EN/ES, Nov 2016) ([FTC](https://www.ftc.gov/business-guidance/resources/buyers-guide-fillable-form)); block listing without a guide; inject the §455.3(b) sentence into every contract; keep the signed copy | Verified. Font sizes exist only in the rule's figures; check the [FTC Dealer's Guide](https://ftc.gov/business-guidance/resources/dealers-guide-used-car-rule) |
| Odometer, 49 CFR 580 | Since Jan 1, 2021, disclosure is required for **20 years from MY2011**; MY2010 and older keep the 10-year exemption ([NHTSA](https://www.nhtsa.gov/press-releases/consumer-alert-changes-odometer-disclosure-requirements)). Electronic disclosure is allowed where approved systems exist ([FR 2019-25657](https://www.govinfo.gov/content/pkg/FR-2019-11-26/html/2019-25657.htm)). Retain **5 years**; a GVWR exemption exists ([eCFR 580](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-580)) | Logic for whether disclosure is required (model year and age); capture mileage at acquisition, sale and SB 766 return | 20-year rule verified; e-odometer from search results only; 5-year retention and 16,000 lb threshold **unverified** |
| Safeguards Rule, 16 CFR 314 | §314.4(c): access controls, data inventory, encryption in transit and at rest, MFA for anyone accessing the system, disposal **≤2 years** after last use unless law or business need requires keeping it, change management, logging of user activity. Annual penetration test and vulnerability assessment **every 6 months** unless continuous monitoring. FTC notice **≤30 days** after discovering an event affecting **≥500 consumers** (since May 2024). Institutions with **<5,000 consumers** are exempt from the written risk assessment, pen testing, written incident-response plan and annual board report, **but not from §314.4(c)** ([§314.4](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314/section-314.4); [§314.6](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314/section-314.6); [FTC guidance](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know)) | Architecture (see the architecture section) plus a breach workflow with a 30-day clock and a consumer counter | Verified |
| GLBA Privacy Rule, 16 CFR 313 | Initial privacy notice at consummation; annual notice unless the FAST Act exception applies; opt-out notice if sharing outside the exceptions ([eCFR 313](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-313)) | Privacy notice in every financed jacket; delivery logged | **Unverified** |
| ECOA / Reg B, 12 CFR 1002 | Adverse action notice within **30 days** of a completed application; keep applications and notices **25 months**; in indirect deals the dealer may rely on the lender's notice ([eCFR 1002](https://www.ecfr.gov/current/title-12/chapter-X/part-1002)) | Adverse-action tracker with a 30-day clock; 25-month retention floor | **Unverified** |
| FCRA and Risk-Based Pricing, 12 CFR 1022 | Permissible purpose before pulling; adverse action content; risk-based pricing notice or the credit score disclosure exception notice ([eCFR 1022](https://www.ecfr.gov/current/title-12/chapter-X/part-1022)) | Credit score disclosure generated with every pull; consent recorded | **Unverified** |
| Red Flags Rule, 16 CFR 681 | Creditors with covered accounts need a written identity-theft program approved by the board or a senior manager. BHPH dealers clearly qualify; arranging-only dealers may ([eCFR 681](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-F/part-681)) | ID verification step and red-flag checklist on each credit deal | **Unverified** |
| OFAC | No dealer-specific statute. Dealing with a listed person is prohibited, so dealers screen every buyer and co-buyer ([OFAC SDN list](https://ofac.treasury.gov/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists)) | Local SDN screening against a downloaded list; result stored in the jacket | Practice-based; **unverified** |
| IRS Form 8300 | Cash over **$10,000** in one transaction or related transactions within **15 days**. For vehicles, cashier's checks and money orders of $10,000 or less count as cash. Payer statement by **Jan 31**; retain **5 years**; e-file if filing **10+** information returns a year ([IRS guide](https://www.irs.gov/businesses/small-businesses-self-employed/irs-form-8300-reference-guide)) | Cash aggregation per customer across down payment and BHPH payments; alert and form prep | **Unverified** |
| TILA / Reg Z, 12 CFR 1026 | Closed-end disclosures (APR, finance charge, amount financed, total of payments, schedule) before consummation; keep evidence **2 years** ([eCFR 1026](https://www.ecfr.gov/current/title-12/chapter-X/part-1026)) | TILA box calculation for BHPH; lender forms for indirect deals | **Unverified** |
| TCPA, 47 CFR 64.1200 | Prior express written consent for autodialed or prerecorded marketing; calls only **8 a.m.–9 p.m.**; National and internal DNC lists; consent revocations honored within **10 business days** (April 2025) ([eCFR](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200)) | Consent ledger, quiet-hours guard, DNC flag | **Unverified** |

### California: SB 766 turns every quote, ad and text into a compliance record

California's **CARS Act (SB 766)** was chaptered October 6, 2025, is codified at Civil Code §1784.20 et seq., and became operative **October 1, 2026**. It applies to retail sales and leases of vehicles under **10,000 lb GVWR**. It **repealed VC §11713.21**, the old optional 2-day contract cancellation product ([California Dealer Academy](https://www.californiadealeracademy.com/articles/cars-act-sb-766-major-changes-coming-october-1-2026); [Hudson Cook via JD Supra](https://www.jdsupra.com/legalnews/california-enacts-the-combating-auto-3263610/)).

Four requirements drive most of the build:

- **The 3-day right to cancel.** It covers used vehicles priced **$50,000 or less** and is lost after **more than 400 miles**. The restocking fee is **1.5% of the price, with a $200 minimum and $600 maximum**, plus **$1 per mile over 250, capped at $150**. The refund is due within **48 hours**. A returned trade-in is valued at the greatest of three figures: the contract value, the dealer's actual resale price, or fair market value.
- **Three cancellation disclosures.** A posted notice in **at least 36-point type** in every sales office (VC §11709.2). A separate document titled "3-Day Right to Cancel Used Car Purchase or Lease" (Civ. Code §1784.43(b)). A notice on the first page of the contract.
- **Total-price advertising.** The total price must appear in every vehicle-specific ad and in the **first written communication** about a vehicle or terms. "Call for price" alone does not satisfy the rule. Ads for sold vehicles must come down within **48 hours**.
- **Add-on and payment rules.** Each add-on must be disclosed as not required. Payment quotes must state the total of payments and warn that lower payments often cost more overall. Certain products are banned, such as EV oil-change plans and nitrogen below 95% purity. The add-on provider must be paid within **10 days**.

Disclosures must be translated into Spanish, Chinese, Korean, Tagalog or Vietnamese when the deal is negotiated mainly in that language, and SB 766 records must be kept **2 years** (all [California Dealer Academy](https://www.californiadealeracademy.com/articles/cars-act-sb-766-major-changes-coming-october-1-2026)). DMV's OLIN 2026-10 adds that add-ons must be disclosed in at least **12-point type** ([CA DMV OLIN 2026-10](https://www.dmv.ca.gov/portal/file/26olin10-pdf/)).

Two discrepancies need a lawyer or the statute text before code is frozen:

1. **The cancellation window.** The training source describes **3 calendar days** starting the day after execution, ending at close of business on day 3 or the next business day if the dealer is closed. DMV's OLIN summary calls it a "3-business-day" right. The engine should compute both deadlines and use the later one until Civ. Code §1784.x is read. Honoring a cancellation late costs a car; refusing one early is a violation.
2. **The first-page notice citation.** One source cites Civ. Code §2982(r) and §2985.8(e). Another cites §1784.43(e).

To make the restocking math concrete: on a $15,000 car returned with 300 miles, the fee is $225 (1.5%) plus $50 (50 miles over 250), for **$275 total**. On a $10,000 car the percentage fee rises to the $200 floor, and on a $45,000 car it falls to the $600 cap.

| California rule | Exact requirement | What the DMS enforces | Status |
|---|---|---|---|
| SB 766 eligibility and 3-day cancel | Used, ≤$50,000, GVWR <10,000 lb. Excludes motorcycles, wholesale, fleet, buyers of 5+ vehicles a year, and vehicles that need no registration. Fees and refund rules as described above | Eligibility check; deadline from execution time and business-hours calendar; odometer at delivery and return; `clamp(0.015 × price, 200, 600) + min(max(0, miles − 250), 150)`; 48-hour refund timer; trade-in valuation as the maximum of three figures | Secondary (training site citing code); window-length conflict flagged |
| SB 766 disclosures | 36-pt posted notice; standalone document; first-page contract notice; translations in 5 languages; add-on disclosure ≥12 pt | Generate all three; "primary negotiation language" field on each deal triggers translations; print the posted notice | Secondary plus OLIN 2026-10 |
| SB 766 advertising and records | Total price excludes only taxes, registration, tire fee, certificate of compliance fee, finance charges, doc fee, e-filing fee and emissions up to $50 plus certificate (VC §11713.1(e)). Archive first written communication 2 years. Withdraw ads within 48 hours | Total-price calculator feeding website and feeds; every outbound quote archived; feed drops sold units automatically with timestamps | Secondary |
| NMVTIS, VC 11713.26 | No retail display or offer without an NMVTIS report from an approved provider. If the report shows a brand, total loss, junk or salvage: red label **≥4" x 5.5"**, body text **≥14 pt** bold, "Warning" in **18 pt**, posted near the Buyer's Guide. Buyer gets a copy on request. Exempt: RVs, motorcycles, off-highway vehicles ([Justia](https://law.justia.com/codes/california/2023/code-veh/division-5/chapter-4/article-1/section-11713-26)) | Listing gate; brand detection prompt; label printed to spec | Verified (2023 code text; check current leginfo) |
| Doc fee, VC 4456.5 | Document processing charge capped at **$85** with a §1685 electronic-registration partner, **$70** without; may not be presented as a government fee; e-filing charge is pass-through actual cost ([VC 4456.5](https://california.public.law/codes/vehicle_code_section_4456.5)). SB 791's proposed increase was **vetoed** in Oct 2025 ([CalMatters](https://calmatters.org/politics/2025/10/california-car-dealer-fees-veto/)) | Cap enforced from the dealer's FLSP setting; e-filing field limited to entered cost | Verified |
| eROS and temporary plates | TLPs only on FLSP-approved templates and paper; **no handwritten TLPs**; Fairfax "Quicktags" is the free state-vendor fallback; late reports past the 5-day/20-day periods incur fees ([OLIN 2024-07](https://qr.dmv.ca.gov/portal/file/24olin07.pdf)). DMV charges **$7** per BPA transaction ([Expert EVR](https://www.expertevr.com/products/registration-services/)) | Export and worksheet for the FLSP; TLP number and report-of-sale timestamps captured; deadline alerts | Verified |
| Dealer records, 13 CCR 272.00 / 272.02 | Keep **3 years**. Originals stay onsite **90 days**, then may move offsite in California. Electronic originals must be non-alterable, accessible, legible, complete and accurate, producible on **3 business days'** notice, and access-controlled. A third-party store does not shift the duty. Operative 4/1/2024 ([Cornell LII](https://www.law.cornell.edu/regulations/california/13-CCR-272.02); [272.00](https://regulations.justia.com/states/california/title-13/division-1/chapter-1/article-4-2/section-272-00)) | Records design (see the records section) | Verified |
| Automobile Sales Finance Act | Keep **7 years or contract life, whichever is longer** (Civ. Code §2984.5 as cited). Single-document rule (§2981.9). Pre-contract itemized add-on disclosure (§2982.2) ([leginfo](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&title=14.&part=4.&chapter=2b.)) | Retention floor for financed jackets; pre-contract add-on worksheet | Retention secondary (one source); other items **unverified** |
| Sales tax | District tax follows the buyer's registration address (R&T §7205.1). Rates change quarterly: as of Oct 1, 2026, neighboring cities in one county can sit at **8.75%** and **7.75%** ([CDTFA rates](https://cdtfa.ca.gov/taxes-and-fees/rates.aspx?os=os)) | Dated rate table keyed by address and effective date | Rates verified; address rule **unverified** |
| Smog | Seller provides a valid smog certificate (valid 90 days) except for vehicles 4 or fewer model years old, EVs and other exemptions ([DMV VIRP manual](https://www.dmv.ca.gov/portal/?p=13504)) | Certificate attached before delivery; exemption logic | **Unverified** |
| CCPA/CPRA | "Business" threshold **$26,625,000** revenue (2025+); fines up to $2,663 / $7,988 ([CPPA](https://www.cppa.ca.gov/regulations/cpi_adjustment.html)) | Most small dealers fall below; keep privacy-request tooling for later | Verified |

### Every jacket runs several retention clocks at once

The deal jacket ties all of these rules together. Each record type carries the longest retention period that applies to it, and a legal hold overrides disposal. The Safeguards two-year disposal duty conflicts with these floors only on its face, because §314.4(c)(6) exempts information the law requires the dealer to keep ([§314.4](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314/section-314.4)). The engine keeps the required record and purges the PII it does not need.

| Jacket item | Governing rule | Minimum retention |
|---|---|---|
| Acquisition documents, title, odometer received | 13 CCR 272; 49 CFR 580 | 3 yr; 5 yr for odometer (unverified) |
| NMVTIS report and any warning label | VC 11713.26; 13 CCR 272 | 3 yr |
| Signed Buyer's Guide (EN/ES) | 16 CFR 455; 13 CCR 272 | 3 yr |
| Ads and first written communications | SB 766 | 2 yr |
| Credit application, OFAC result, ID and Red Flags check, adverse action or credit score notice | Reg B, FCRA (unverified) | 25 months, or longer if financed |
| Retail installment contract or cash purchase agreement | ASFA; Reg Z | 7 yr or contract life if financed (secondary); otherwise 3 yr |
| Add-on, payment-quote and pre-contract disclosures; VSC/GAP contracts | SB 766; Civ. 2982.2 | Longer of 2 yr or the contract's period |
| 3-Day Right to Cancel document and cancellation log | SB 766 | 2 yr |
| Odometer disclosure issued | 49 CFR 580 | 5 yr (unverified) |
| Form 8300 and payer statement | IRS (unverified) | 5 yr |
| DMV forms, TLP record, smog certificate | 13 CCR 272 | 3 yr |
| BHPH payment history, collection notes, repossession notices | ASFA | Contract life plus 7 yr (secondary) |

## Integrate open feeds in year one; regulated pipes need partners, and DMV always needs an intermediary

Integrations fall into three tiers by who controls access. **Open, self-serve services** can ship in the first public release. **Partner programs** need a legal entity, a commercial agreement and sometimes certification. **Regulated chokepoints** are never reachable directly: the DMS prepares data and a licensed provider transmits it.

California registration is the clearest regulated chokepoint. DMV contracts with First Line Service Providers under VC §1685 and 13 CCR Article 3.6. Dealers transact as second-line partners through an FLSP's platform, and "the DMV contracts with providers; it does not endorse them" ([Expert EVR](https://www.expertevr.com/products/registration-services/)). FLSPs "must electronically transmit registration transactions … to DMV through a secure network," and TLPs must be printed on FLSP-approved templates and paper ([OLIN 2024-07](https://qr.dmv.ca.gov/portal/file/24olin07.pdf)). The authorized TLP providers are Fairfax Imaging (the state vendor), ADR, AVRS, Dealertrack and Motor Vehicle Software Corp ([CA DMV TLP FAQ](https://dmv.ca.gov/portal/file/temporary-license-plates-dealer-faqs-pdf)). None of the FLSP pages reviewed documents a public API or DMS file import. In year one, then, the DMS produces a pre-filled worksheet and export for the dealer to key or upload into the FLSP portal. A data-import partnership with a smaller FLSP comes later.

| Category | Year one: open or self-serve | Later: partner agreement | Stays with a regulated or outside provider? | Known costs |
|---|---|---|---|---|
| VIN decode | NHTSA vPIC: free, "no need to register," no daily limit; run large batches off-hours ([vPIC FAQ](https://vpic.nhtsa.dot.gov/api/home/index/faq)). Cache results locally | Pluggable provider for trim and options (VinAudit, DataOne, Chrome Data on the dealer's own contract) | No | vPIC $0; VinAudit self-service **$100/month + $0.10/query**, 100-query free trial ([VinAudit](https://data.vinaudit.com/pricing)) |
| NMVTIS and history reports | Upload a PDF from any DOJ-approved provider the dealer uses; deep links to the dealer's own Carfax or AutoCheck session | VinAudit NMVTIS API ([VinAudit](https://data.vinaudit.com/nmvtis-api)); Experian AutoCheck "Fast Link Integration Partner" application ([Experian](https://experian.com/automotive/autocheck-integrations)) | The report must come from an approved NMVTIS provider | Market benchmark $0.25/report through DealerCenter ([rfp.wiki](https://www.rfp.wiki/specialty-industries/dealer-management-systems/frazer/dealercenter)) |
| Buyer's Guide and generated documents | FTC fillable PDFs (public domain) | — | No | $0 |
| Retail installment contract forms | Bring-your-own template slot | Licensing agreement with a forms supplier or lender | Yes: licensed content; legal drafting risk | LAW 553 forms run $3.30–$3.50/deal through Lot Wizard ([GARAGEBIRDS](https://garagebirds.com/cheapest-dealer-management-software.html)) |
| eROS, TLP, registration | Worksheet and export; capture TLP number | DMS import or API with one or two FLSPs (Expert EVR, AVRS, CVR) | **Yes, always**: only DMV-contracted FLSPs transmit | DMV $7 per BPA transaction; FLSP fees private |
| Listing syndication | Hosted feed URL per dealer in Meta Vehicles catalog format (CSV/TSV/XML, scheduled fetch) ([Meta](https://developers.facebook.com/documentation/ads-commerce/marketing-api/auto-ads/guides/catalog)) and Google Vehicle Listings CSV ([Google](https://developers.google.com/vehicle-listings/integration-process/feed-setup?hl=en)); generic CSV | Certified feed provider for Cars.com, CarGurus, Autotrader; DealersCloud syndicates to all three plus TrueCar, KSL and Facebook ([DealersCloud](https://www.dealerscloud.com/integrations/inventory-feeds)) | No | Cars.com allows 32 photos at 8 MB each; manual edits lock fields against feed updates ([Cars.com](https://help.carscommerce.inc/?p=11808)) |
| Credit bureau pulls | Credit-application packet; deep link to the dealer's own portal | 700Credit: sandbox, one normalized format for all three bureaus, "aggressive revenue share," 200+ partners ([700Credit](https://www.700credit.com/integration-solutions/)) | Yes: the dealer must be credentialed by the reseller for permissible purpose (site inspection requirement unverified) | Per-pull pricing not found |
| Lender submission and e-contracting | Deal packet export | RouteOne serves 200+ dealer service providers through API web services, with no public onboarding ([RouteOne](https://routeone.com/node/13116)). Dealertrack Opentrack integrates *into* Dealertrack's own DMS ([Opentrack sheet](https://us.dealertrack.com/wp-content/uploads/sites/2/2020/08/DMS-Opentrack-Info-Sheet.pdf)) | Yes: e-contracts depend on lender-approved eVaults (legal research needed) | Not published |
| Accounting | QuickBooks Online Builder tier: $0/month, 500,000 read calls a month; "Core" create/update calls free and unlimited ([Apideck](https://www.apideck.com/blog/quickbooks-api-pricing-and-the-intuit-app-partner-program); [Intuit FAQ](https://developer.intuit.com/app/developer/qbo/docs/get-started/partner-faq)) | Silver tier ($300/month) if premium APIs are needed | No | $0 at small-dealer volume |
| SMS | Bring your own Twilio account; guided 10DLC registration | Pooled numbers on hosted tier | No, but each dealer is its own registered brand | $4.50 brand registration + $41.50 Standard vetting, plus campaign fees ([Twilio](https://www.twilio.com/docs/trust-hub/registrations/a2p-10dlc-brand)) |
| E-signature (non-contract documents) | Self-hosted Documenso (AGPL-3.0, same stack) ([Documenso](https://github.com/documenso/documenso/)) | DocuSign or Dropbox Sign connectors | Contracts that will be assigned to lenders: yes (eVault) | Not researched |
| OFAC and ID verification | Local screening against the downloadable SDN list; PDF417 driver's-license barcode parsing (library details unverified) | 700Credit OFAC/ID bundle | No | — |

Three architectural consequences follow from the table. **Credentials belong to each dealer, not the project.** vPIC needs no key, so every self-hosted install can call it directly. QuickBooks and Twilio, by contrast, need either a per-install app registration or one project-operated app on the hosted tier. This "bring your own key" versus "hosted app" split is itself a natural line between free and paid. **The NMVTIS gate does not depend on any API.** An uploaded, dated PDF from any approved provider satisfies VC 11713.26, so the cheapest compliant path costs the project nothing. **The 48-hour ad-withdrawal rule makes syndication a compliance feature.** Marking a car sold must regenerate every feed and log the time.

## One Postgres database, row-level tenancy and a write-once deal jacket

### A TypeScript monorepo copies the patterns contributors already know

Comparable open-source SaaS products use **TypeScript monorepos on PostgreSQL**:

- Cal.com: Next.js, tRPC, Prisma and Turborepo, with `ee/` subfolders and a 112-integration `app-store` package ([Cal.com architecture](https://www.mintlify.com/calcom/cal.com/developers/contributing/architecture)).
- Documenso: React Router v7, Hono, tRPC, Prisma and pdf-lib, AGPL-3.0, with `packages/ee` under a commercial license ([Documenso](https://github.com/documenso/documenso/); [DEV](https://dev.to/thinkthroo/whats-the-ee-folder-in-open-source-projects-5056)).
- Twenty: NestJS, GraphQL and TypeORM, with Redis and BullMQ ([Twenty architecture](https://www.mintlify.com/twentyhq/twenty/developers/architecture)).

For a solo founder the recommendation is one web app plus one worker process. The app uses Next.js or React Router v7, Postgres, Drizzle or Prisma, and Tailwind/shadcn, tested with Vitest and Playwright. Twenty's separate NestJS/GraphQL service layer is too heavy for one developer. Django would be just as productive, but none of the comparable projects use it, so it offers fewer patterns to copy. A Postgres-backed job queue such as pg-boss or Graphile Worker spares self-hosters from running Redis; this is engineering judgment, not a sourced comparison.

```
apps/web              web app (desk, inventory, jacket, admin)
apps/worker           jobs: PDF render, feeds, retention sweeps, audit shipping, backups check
packages/db           schema, migrations, tenant-scoped client (sets app.dealer_id)
packages/core         domain: vehicles, deals, customers, state machines
packages/compliance   engine + packs/ca (rules, fees, forms maps, retention), each with citations
packages/pdf          AcroForm filling (FTC, DMV) and generated docs; PDF/A finalization
packages/crypto       encryptField / decryptField / blindIndex; KMS adapters
packages/integrations vPIC, feeds, QuickBooks, Twilio, provider plugin interfaces
packages/ee           commercial: multi-rooftop, SSO, white-label, partner connectors, BHPH servicing
docker/               compose, images, backup sidecar
```

### Shared tables with forced row-level security serve both one lot and many

AWS's tenancy decision matrix favors the **pool model** (shared tables with a tenant column) for "a large number of tenants with little data each". It has the lowest cost and the simplest deployment. Its isolation depends on RLS, and per-tenant restore is harder ([AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/matrix.html)). Twenty instead uses a Postgres schema per workspace, which brings per-schema migrations a solo developer should avoid ([PyShine](https://pyshine.com/Twenty-Metadata-Engine-Source-Tour/)). The pool model also gives self-hosting for free, because a single-dealer install is simply a pool with one tenant. There is then no separate single-tenant code path to maintain.

The implementation details matter because RLS fails silently. Superusers, roles with BYPASSRLS and table owners bypass policies unless `FORCE ROW LEVEL SECURITY` is set. Unique and foreign-key checks bypass RLS entirely, which can leak data through a "covert channel" ([PostgreSQL docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)). After a transaction-scoped `set_config` ends, a pooled connection reads the setting as an empty string, not NULL ([DEV](https://dev.to/wenceslaudev/postgres-rls-multi-tenancy-two-traps-that-silently-disable-your-policies-5gn8)). The pattern that avoids these traps has six parts:

1. Every tenant table carries a `dealer_id uuid NOT NULL`, with indexes that lead with it.
2. RLS is enabled and forced, using `dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid`.
3. The app connects as a non-owner `NOBYPASSRLS` role.
4. Each request runs in a transaction that sets the dealer context.
5. Keys are UUIDv7, and composite foreign keys on `(dealer_id, id)` block cross-tenant references.
6. CI runs a cross-tenant leak test suite as the application role.

A per-dealer export job should be built early. Pool-model restores are hard, and a dealer leaving the hosted service still has to produce records for DMV. A database-per-dealer "dedicated" tier can come much later.

### The Safeguards Rule reads like a product specification

Every element of §314.4(c) maps to a control that belongs in the free core and in every deployment.

| Safeguards element | Product control |
|---|---|
| Access controls, least privilege, periodic review | Default roles: salesperson (no full SSN or credit report), F&I (can reveal, every reveal logged), owner/admin, read-only auditor. "Reveal" action to unmask SSN or license number. Quarterly access-review report |
| MFA for anyone accessing the system (two of knowledge, possession, inherence) ([§314.2](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314/section-314.2)) | Mandatory TOTP or passkeys/WebAuthn for every user, no opt-out; SSO for larger groups in `ee/` |
| Encryption in transit and at rest, with protected key material | TLS 1.2+ and HSTS; encrypted volumes and buckets; **application-level field encryption** for SSN, license number, date of birth, bank accounts and credit payloads |
| Data inventory | Generated data map: which tables and fields hold customer information, where, and who can read them |
| Secure development and change management | Protected main branch, required review, CodeQL/Semgrep, dependency and container scanning, secret scanning, signed images and SBOM, `SECURITY.md` with private reporting |
| Monitoring and logging of user activity | Append-only, hash-chained audit log of logins, MFA events, PII reveals, exports, deal edits and document views, shipped off the main database; alerts for bulk exports or reveal spikes |
| Disposal ≤2 years after last use | Retention scheduler that crypto-shreds unneeded PII and keeps legally required records; every disposal logged |
| Pen test annually, vulnerability scans every 6 months (§314.4(d)(2)) | Hosted tier runs both; self-host docs provide a checklist. Dealers under 5,000 consumers are exempt ([§314.6](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314/section-314.6)) |
| Incident response; FTC notice ≤30 days for ≥500 consumers (§314.4(h), (j)) | Incident workflow with discovery timestamp, affected-consumer count from the audit log, and a draft FTC report |
| Service-provider oversight ([FTC guidance](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know)) | Hosted tier publishes a shared-responsibility matrix, a template written information security program and incident-response plan, and works toward SOC 2 once revenue allows |

Field encryption should use **envelope encryption with a per-dealer data key**. The key is wrapped by a cloud KMS on the hosted tier, or by a mounted secret or Vault/OpenBao for self-hosters. Each value is sealed with AES-256-GCM, with the dealer, table, column and row bound in as additional authenticated data, so ciphertext cannot be pasted into another row or tenant. `prisma-field-encryption` already implements AES-256-GCM with versioned keys and rotation ([npm](https://www.npmjs.com/package/prisma-field-encryption)). Two refinements matter. First, its companion hash for exact-match lookup is SHA-256 with a salt. For SSNs, which have only about a billion possible values, use a keyed HMAC "blind index" with a separate per-dealer key instead. Second, per-dealer keys allow **crypto-shredding**: destroying a key makes data unreadable even in old backups, which is the only practical way to honor the two-year disposal duty against backup retention. The stakes are real. The June 2024 CDK Global cyberattack disrupted roughly **15,000 US dealerships** that relied on one hosted DMS ([Help Net Security](https://www.helpnetsecurity.com/2024/06/20/cdk-cyberattack/)). Every dealer should therefore be able to export everything and run the system themselves.

Self-hosting shifts these duties to the dealer. Whoever runs the server effectively takes on the Qualified Individual's job for MFA, encryption, logging and testing on that infrastructure. The self-host docs should say so plainly, and the hosted tier should be positioned as the compliant default for dealers without IT staff.

### 13 CCR 272.02 dictates a write-once records store

California allows original electronic records only if they are "non-alterable," "readily accessible and retrievable," "legible, complete and accurate," available "for inspection upon three business days' notice," and protected by "access controls and physical security measures." Using a third-party store "does not reduce" the dealer's duty to produce them ([13 CCR 272.02](https://www.law.cornell.edu/regulations/california/13-CCR-272.02)). The records design follows directly:

1. **Finalization freezes documents.** A finalized deal document is rendered to PDF/A, so it stays legible regardless of future app versions. It is written once to object storage with S3 Object Lock on the hosted tier, or MinIO object locking for self-hosters.
2. **Corrections create versions.** A correction becomes a new linked version; nothing is overwritten.
3. **A ledger proves non-alteration.** Every document's SHA-256 goes into an append-only, per-dealer hash-chained `document_events` ledger. Optionally, a daily root hash can be anchored externally.
4. **Scanned uploads are cleaned and logged.** Driver's licenses, insurance cards and signed contracts are malware-scanned and stripped of EXIF location data. They are stored under a `dealer_id/` prefix and served only through short-lived presigned URLs after an authorization check, with every download logged.
5. **A DMV inspection export.** For a date range or deal number, it produces a ZIP of PDFs with a hash manifest in minutes, well inside the three-business-day window, on both hosted and self-hosted installs.
6. **Offboarding guarantees.** Hosted terms must guarantee full export and keep data readable for a period after cancellation, because the duty to produce records stays with the dealer.

### Compliance rules ship as dated data with citations and golden tests

The California pack should be data plus pure functions, not code buried in controllers. Each rule carries an `effectiveFrom`/`effectiveTo` date, so a 2026 deal re-renders under 2026 law in 2029. Each rule also cites its statute or regulation URL in metadata. Fee and tax tables are versioned data, and form field maps live next to their PDFs. **Golden-file tests** run fixture deals through the engine and compare the required-document lists, fee totals and filled PDFs field by field. A CODEOWNERS entry per state pack routes changes to a maintainer who knows that state's law. Keeping the rule data in YAML or JSON lets a dealer or compliance consultant propose a fix by pull request without writing TypeScript. That opens a contribution channel to people who know the law but do not write code. CI also runs migrations from the previous release against a seeded database and uses entirely synthetic fixtures with no real PII. Distribution follows the comparables: official images on GHCR or Docker Hub, a Compose file with Postgres and S3-compatible storage, an idempotent migrate entrypoint, and one-click Railway, Render and Coolify templates ([Documenso](https://github.com/documenso/documenso/); [Coolify](https://coolify.io/docs/services/overview)). On the lot, a responsive PWA handles VIN barcode scans, photos and check-in offline. It should never cache SSNs, credit data or license images on phones.

## Three phases take the product from one lot to a hosted business

### Phase 1: an MVP that runs a first dealer's retail deals

Phase 1 serves one dealership and has one goal: complete compliant retail deals end to end, with one dealer as customer zero. The MVP has to be usable the moment that dealer's lot opens. Run it **in parallel with a low-cost commercial DMS such as DealerVLO ($29/month)** for the first deals. Reconcile every figure and document between the two before relying on the MVP alone. Phase 1 covers cash and outside-finance deals only; BHPH waits. It deploys as a single tenant, but the tenancy, RLS, MFA, field encryption and audit log go in from the first commit, because retrofitting them later is the expensive path.

Scope for the 15 modules:

| Module | Phase 1 scope |
|---|---|
| Inventory | vPIC decode, the four-step status workflow, and the NMVTIS PDF upload gate |
| Pricing | Total-price calculator |
| Forms | FTC Buyer's Guide fill in English and Spanish |
| Desking | Cash and outside-finance deals with an address-dated tax table and the $85 doc-fee cap |
| Compliance engine | SB 766 eligibility, deadline, restocking and refund-timer logic; odometer-requirement logic; OFAC SDN screening; 8300 cash alert |
| Records | Write-once jacket with retention timers and the DMV inspection export |
| DMV handoff | eROS worksheet export |
| Communications | A log capturing first written communications |
| Merchandising | Simple CSV feed |

Exit criteria:

- At least ten real deals reconcile with the parallel system.
- A mock DMV inspection export is produced in under an hour.
- The cross-tenant leak suite passes.
- A written Safeguards program names who the Qualified Individual is.

The earlier estimate of **100–300+ hours** for a basic secure custom web app is a floor. The SB 766 engine and the records store push the MVP toward the top of that range or past it. That figure is an estimate, not a sourced benchmark.

### Phase 2: a public GitHub release that other dealers can self-host

Phase 2 makes the project usable and contributable by strangers. Before any outside code arrives, it adds:

- The AGPL license, `ee/` scaffold, CLA, trademark policy, `SECURITY.md` and "templates are not legal advice" notices.
- Docker Compose with backup and restore-test commands.
- One-click templates.
- The California pack restructured as cited, dated data with golden tests.
- Meta and Google vehicle feeds that drop sold units within 48 hours.
- QuickBooks and Twilio connectors on the dealer's own credentials, with a TCPA consent ledger.
- A pluggable VIN and history provider interface (VinAudit).
- Self-hosted Documenso for signing non-contract documents.
- A Spanish user interface.
- Safeguards templates (WISP and incident-response plan) and the shared-responsibility guide for self-hosters.

Exit criteria: an outside dealer installs from the docs without help, and a non-founder contributor lands a rule-pack change through review.

### Phase 3: a hosted tier that pays for maintenance

Phase 3 builds the hosted tier:

- Multi-tenant pool on managed Postgres.
- Per-dealer data keys in a cloud KMS.
- Object Lock storage.
- Managed backups with restore drills.
- Annual penetration testing and semiannual vulnerability scans.
- Status page and billing.
- Terms of service with limitation of liability and an offboarding export guarantee.

The paid `ee/` features ship with it: multi-rooftop, SSO and custom roles, white-label and reseller rights, and priority support with migration services. Phase 3 also opens the first partner integrations, in order of how attainable they are. 700Credit comes first because of its revenue share. Next are an AutoCheck Fast Link application and a data-import arrangement with one FLSP. Last is a licensed RISC forms bundle. **BHPH servicing** arrives as the anchor of a "Plus" tier: amortization, the TILA box, payment posting, collections with TCPA guards, repossession notices, 8300 aggregation across payments and Metro 2 furnishing. SOC 2 Type I should follow once hosted revenue can carry it.

### Module scope by phase

| Module | Phase 1: MVP (one dealer, single tenant) | Phase 2: public open-source release | Phase 3: hosted paid tier |
|---|---|---|---|
| Inventory and acquisition | vPIC decode and cache; cost, title, odometer received; NMVTIS PDF gate; CA warning label print; photo capture PWA | Provider plugin (VinAudit decode and history); bulk CSV import from other DMSs | VinAudit NMVTIS API option; AutoCheck Fast Link |
| Reconditioning | Repair orders added to cost | Vendor list, recon pipeline view | Parts tracking |
| Pricing and valuation | Total-price calculator under VC 11713.1(e) | Valuation-provider plugin interface | Licensed guide connectors (dealer's own contract) |
| Merchandising and syndication | Generic CSV feed; sold-unit removal timestamped | Meta Vehicles and Google Vehicle Listings feeds; simple dealer website widget | Certified feeds to Cars.com, CarGurus, Autotrader |
| CRM and communications | Lead and customer records; first-written-communication archive | Twilio and email on the dealer's own credentials; TCPA consent ledger, quiet hours, DNC | Pooled 10DLC on hosted; message templates |
| Desking | Cash and outside-finance; tax table by address and date; $85/$70 doc-fee cap; SB 766 payment-quote text | Deal templates per dealer; quarterly CDTFA rate-table update job | BHPH structures |
| F&I and credit | Credit-app packet export; OFAC SDN screen; ID check; add-on catalog with "not required" text and banned-product blocks | Adverse-action and credit score notice tracking | 700Credit pulls; RouteOne or Dealertrack submission when a partnership allows |
| Forms and documents | Buyer's Guide EN/ES; SB 766 cancel document and posted notice; odometer statement; bill of sale; privacy notice | Five-language SB 766 translations; bring-your-own RISC template slot; Documenso e-sign | Licensed RISC forms bundle; e-contracting via lender eVault |
| DMV handoff | eROS/registration worksheet and export; TLP number and deadline alerts | Export formats per FLSP | FLSP data-import partnership |
| Accounting | Per-vehicle P&L; add-on provider 10-day payable | QuickBooks Online sync (Builder tier) | Floor plan; multi-rooftop consolidation |
| BHPH servicing | Not in scope | Not in scope | `ee/`: amortization, TILA box, payments, late fees, collections, repossession notices, 8300 aggregation, Metro 2 |
| Compliance engine | California rules for SB 766, NMVTIS, doc fee, odometer, 8300, retention | Packs as cited, dated data; golden tests; CODEOWNERS; contributor guide | Automatic pack updates on effective dates; second-state pack scaffold |
| Deal jacket and records | Write-once PDF/A store, hash ledger, retention timers, legal hold, DMV inspection export | MinIO object-lock recipe; restore test | S3 Object Lock; offboarding export guarantee |
| Reporting | Days on lot, gross per deal, cancellation log, compliance exceptions | Access-review and audit reports | Group dashboards across rooftops |
| Platform and security | Mandatory MFA, default roles, PII reveal logging, field encryption, audit log, RLS with leak tests | Docker images, SBOM, signed releases, `SECURITY.md`, Safeguards templates | KMS keys per dealer, pen tests, scans, SSO/SCIM, SOC 2 path, incident workflow |

Some items wait until after Phase 3, each gated by a partner agreement or a legal review rather than by engineering: RouteOne and Dealertrack lender integrations, e-contracting through a lender eVault, additional state packs, a dedicated single-tenant database tier, and SOC 2 Type II.

## Conclusion

The research changes the frame of the question. The scarce asset is not code; vendors have shipped inventory and desking screens for decades. The scarce asset is a **public, dated and cited model of what the law requires**, executed as gates and clocks rather than as printable forms. SB 766 makes this unusually urgent and unusually valuable. It turned every text message quote into a two-year record and every sold car into a 48-hour ad-takedown deadline. It also created a cancellation window whose length the sources still disagree on. Commercial vendors handle these changes privately and on their own schedule. An open rule pack that any dealer, attorney or compliance consultant can audit in a pull request is a competitive advantage no closed DMS can copy. It is also the strongest argument for AGPL over source-available licensing.

The business follows from the same logic. The Safeguards Rule means self-hosting a DMS is never really free for a dealer, because whoever runs the server takes on the security program. That makes the hosted tier the natural purchase for nearly every real dealership. The open repository then serves as the trust signal, the contributor magnet and the exit guarantee, the last of which matters after the CDK outage. The near-term risks are concrete and checkable: the cancellation-window wording, the unverified federal retention periods, and whether an FLSP will accept a data import from a small open-source vendor. Settling those three before Phase 1 code is frozen matters more than any choice of framework.
