# Phase 5 — Client Billing Visibility, Stripe Invoice Status & Monthly Work Summaries

**Status:** Approved for phased implementation. **Batches 5A–5C implemented in repository and verified** (`npm run verify:phase5-batch-5a`, `npm run verify:phase5-batch-5b`, `npm run verify:phase5-batch-5c`). Batches **5D–5E remain unauthorized**. Phase 5 as a whole is **not** complete. Clients can view TEST-mode Stripe invoices in the portal when eligible; they cannot pay inside KXD OS.  
**Companion:** `docs/KXD-OS-ROADMAP.md`, `docs/KXD-OS-CURRENT-STATE.md`, `docs/KXD-OS-PRODUCT-ROADMAP.md`, `docs/KXD-OS-V1-FOUNDING-CLIENT-EARLY-ACCESS.md`, `docs/KXD-OS-COMMERCIAL-LIFECYCLE-RELEASE-GATE.md`, `docs/PHASE-4-MULTI-CLIENT-PORTAL.md`

> Phase 4 Multi-Client Portal Access remains **not fully production-complete**. Phase 5 may proceed as a **parallel, non-Primal product lane**. Starting Phase 5 does **not** waive, bypass, redefine, or complete any remaining Phase 4 rollout requirement (including Batch J, Batch J.2B.2, the Primal walkthrough, or the Primal reporting pilot).
>
> Phase 5 must remain independent of Primal analytics, GA4, Google Ads, reporting entitlements, the Primal website repository, and Primal OS.
>
> Phases 35–37 commercial partnership foundations are complete. Phase 5 **reuses** them. Do not reopen activation, plan-change, legacy conversion, custom-plan, or billing-configuration mutation workflows as part of this phase.

---

## Product outcome

Give clients a secure, honest view of:

1. Their Stripe-backed invoice status and Stripe-hosted payment action.
2. Meaningful work KXD completed for them during a selected calendar month.

KXD OS provides **visibility and context**. It must not become an accounting platform, payment vault, billable-hours ledger, or replacement for Stripe.

---

## Business outcome

- Reduce friction between invoicing and payment.
- Make KXD’s completed monthly value more visible.
- Strengthen the client portal as the operating relationship layer.
- Reuse commercial infrastructure from Phases 35–37.
- Avoid duplicating external financial systems or reopening completed commercial activation work.

---

## Sequencing relative to Phase 4

| Rule | Status |
|------|--------|
| Phase 4 Batches A–I | Remain code-complete |
| Phase 4 Batch J production rollout | Remains paused / operator-gated |
| Batch J.2B.2 (Primal GA4 & Ads entitle + sync) | Remains paused |
| Primal walkthrough and reporting pilot | Remain paused |
| Phase 4 marked fully production-complete | **Forbidden** under this approval |
| Phase 5 starts as parallel non-Primal lane | **Approved** |
| Monday Primal Analytics Ownership Audit | Remains top operator priority in CURRENT-STATE |

---

## Source-of-truth decisions (approved)

| Domain | Authority |
|--------|-----------|
| Client-facing invoice and payment status | **Stripe** (sole portal invoice source in Phase 5) |
| Commercial configuration and access | KXD commercial agreements, billing profiles, plans, entitlements |
| Completed-work summary facts | KXD work collections (deliverables, Website Review) |
| Wave / QuickBooks | **Not** portal invoice sources; existing `waveCustomerId` / `quickbooksCustomerId` do not create a dual-ledger or client-facing fallback |
| Invoice projection in KXD | Allowlisted display only — **not** a competing local invoice ledger |
| Payment details / execution | Stripe-hosted pages only |
| Card / bank credentials | Must **never** be stored in KXD OS |

---

## Stripe boundary (approved)

### Authorized (read-only)

Phase 5 may introduce a narrow, server-side authorization path for:

- Listing invoices belonging to the active client’s mapped Stripe customer.
- Retrieving an individual invoice only when it belongs to that same mapped customer.
- Reading allowlisted invoice and payment-status fields.
- Returning Stripe-hosted invoice, payment, or receipt URLs when Stripe provides them.

Authorization must be **explicitly read-only** and **separate** from `STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED`. Do not use or weaken the broad commercial execution gate merely to support invoice reads.

### Not authorized

- Invoice creation or finalization
- Automatic charging
- Payment-method collection inside KXD OS
- Subscription creation or modification
- Payment Links
- Refunds, credits, voids
- Dunning
- Tax calculation
- Revenue recognition / bookkeeping
- Wave or QuickBooks synchronization
- Any other Stripe mutation

Existing lifecycle **TEST-mode** invoice behavior may remain intact and must **not** be broadened by this phase.

Any future live financial mutation requires a separately named and approved batch with operator confirmation, idempotency, recovery, reconciliation, and production authorization.

---

## Portal Billing boundary

Route: `/portal/invoices` (`app/(portal)/portal/(app)/invoices/page.tsx`, `InvoicesScreen`).

Batch 5C replaces the preview shell with the authenticated Billing surface at `/portal/invoices`.

### Allowlisted client-facing fields (when implemented)

- Invoice identifier or display number
- Status
- Amount due
- Amount paid (when useful and safely available)
- Currency
- Created date
- Due date
- Paid date (when applicable)
- Stripe-hosted invoice / payment / receipt actions (when Stripe provides them)

### Never expose

- Internal billing notes
- Stripe metadata not explicitly allowlisted
- Other customers
- Raw provider responses
- Payment credentials
- Financial Command intelligence
- Internal revenue projections
- Secret configuration
- Unrelated commercial agreements

### Authorization

- Derive from authenticated portal session, active membership, and server-resolved `clientId`.
- Browser-supplied customer ID, client ID, or invoice ID must **never** authorize access.
- Forged or cross-client invoice retrieval must fail closed.
- Missing Stripe configuration, missing customer mapping, unavailable provider access, or empty invoice list → calm honest unavailable/empty states — never fabricated invoices.

---

## Navigation decision (approved)

- Do **not** globally expose Billing merely because Phase 5 is documented.
- Batch 5C: nav label **Billing** (`/portal/invoices`) is visible only when the active client has a valid linked **test-mode** Stripe customer mapping (`isPortalBillingNavEligible`). No CES entitlement mutation.
- Direct `/portal/invoices` remains authenticated for all portal sessions and shows honest unavailable/empty states when mapping or provider access is missing.
- Do not expose staff Billing, Financial Command, or dead/unsafe destinations.
- Monthly Work Summary continues through existing Work & Performance (Batch 5A).

---

## Monthly Work Summary boundary (approved)

Monthly Work Summary is an **independent** client-value surface. It may appear near Billing later (Batch 5E), but it is **not** an invoice ledger, line-item generator, billing justification record, credit meter, or billable-hours report.

### Trusted sources (first Phase 5 release / Batch 5A)

- Completed monthly deliverables (`monthly-deliverables`, status `complete`) with schema `completedDate`
- Website Review items with client status **`completed`** (maps from `client-requests.status` = `complete`) and schema `completedDate`

### Website Review status decisions (Batch 5A evidence)

| Client status | Internal request status | Monthly summary |
|---------------|-------------------------|-----------------|
| `completed` | `complete` | **Included** when `completedDate` present |
| `closed` | `declined` | **Excluded** (declined/rejected) |
| `review-received`, `in-review`, `revision-in-progress`, `awaiting-your-input` | `new` / `triaged` / `approved` / `in-progress` / `waiting-on-client` | **Excluded** (incomplete) |

Evidence: `lib/ces/vocabulary/website-review.ts` (`REQUEST_STATUS_TO_REVIEW`); policy in `lib/portal/work-performance/monthly-summary.ts`.

Completion date: `client-requests.completedDate` only (exposed on Website Review items as `completedAt` when set). `updatedAt` / `createdAt` are **not** used as completion proof (`lib/ces/modules/website-review/data.ts`).

### Batch 5A date repair

| Item | Rule |
|------|------|
| Schema source | `completedDate` on monthly deliverables and client-requests |
| Prior bug | Deliverable mapper read `completedAt` and compose fell back to `updatedAt` |
| Corrected behavior | Monthly bucketing uses schema-backed completion day only; missing/invalid dates exclude the record from the month projection |

### Exclude

- Drafts, incomplete work, internal-only work, system noise, duplicates, placeholders
- Automated records that do not represent meaningful client work
- Declined/rejected work (`closed` Website Review)
- Admin-category deliverables and placeholder titles
- Generic requests (initial release)
- Work Engine items (initial release)
- Reports as completed-work claims unless separately approved
- Hours, work credits, utilization, or billing-value calculations
- Invented or reconstructed historical work

The summary must communicate its honest scope and must **not** claim to be a complete ledger of every service KXD performed.

---

## Staff boundary

- Later read-only staff projection may use existing commercial-agreements or Client Command surfaces (**Batch 5D**).
- Do **not** create a new Financial Command system or duplicate internal revenue intelligence.
- Staff invoice visibility is not required for Batch 5A.
- Same mapping, allowlist, provider-error, and no-mutation rules as portal.

---

## Hosting and notifications (approved)

| Decision | Rule |
|----------|------|
| Hosting Transitions | **Excluded** from Phase 5 — require their own future phase or explicitly approved scope |
| KXD invoice emails / reminders / receipts / dunning | **Excluded** |
| Stripe-hosted payment and receipt behavior | Allowed where Stripe already supplies URLs |
| Communications during implementation/verification | None unless separately authorized |

---

## Approved implementation batches

Batches **5A–5C** are implemented in the repository and verified. Batches **5D–5E are not cleared**. Phase 5 is not complete. Billing navigation is eligibility-gated (valid test-mode Stripe customer mapping). Live Stripe invoice access remains unauthorized.

### Batch 5A — Monthly Work Summary Reliability

**Status:** ✅ Implemented in repository — verified (`npm run verify:phase5-batch-5a`).

**Objective:** Repair and harden Phase 4 Work & Performance monthly composition so completed client work is dated accurately and presented honestly.

**Implemented:**

- Central policy: `lib/portal/work-performance/monthly-summary.ts`
- Deliverable mapping uses schema `completedDate` (not `completedAt` / `updatedAt`)
- Website Review summary includes `completed` only; excludes `closed` (declined)
- Website Review `completedAt` projection uses `completedDate` only
- Compose / next-move counts use reliable completion days only
- `isIsoDateInPeriod` compares UTC calendar days (fixes first-of-month exclusion against full ISO period bounds)
- Honest scope note + empty-state language on Work & Performance UI
- Verifier: `scripts/verify-phase5-batch-5a.ts` (`npm run verify:phase5-batch-5a`)
- Phase 4 work-performance verifier updated for non-regression
- `npx tsc --noEmit` and `npm run build` green after Batch 5A

**Excluded (unchanged):** Stripe access, invoice UI, financial mutations, generic requests, Work Engine expansion, work credits, hours, billing calculations, Primal reporting, new navigation systems, Billing nav exposure

### Batch 5B — Stripe Invoice Read Foundation

**Status:** ✅ Implemented in repository — verified (`npm run verify:phase5-batch-5b`). Portal UI consumption is Batch 5C.

**Objective:** Narrow, server-side, client-scoped Stripe invoice read capability for safe portal display.

**Implemented:**

| Concern | Behavior |
|---------|----------|
| Authorization | `STRIPE_PHASE_5B_INVOICE_READS_AUTHORIZED` + op classes `invoice_list` / `invoice_read`. Independent of `STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED` (remains `false`). |
| Mode policy | Server-controlled **test only** (`STRIPE_PHASE_5B_AUTHORIZED_MODE = "test"`). Live mappings → `mode_disallowed`. Browser cannot select mode. Test credentials via existing commercial test-key resolver. |
| Identity | Portal session → `session.clientId` (active membership). No browser `clientId` / customer / mode authority. |
| Customer mapping | `billing-profiles` for active client: `stripeCustomerId`, `stripeMode`, `stripeCustomerMappingStatus`. No create/link/repair/heuristic search. |
| List | `listInvoicesByCustomer(mappedCustomerId, limit)` — customer required; default limit 24, max 48; `hasMore` reported honestly. |
| Read | `invoice_read` implemented for Batch 5C foundation: retrieve → exact customer match + `livemode === false` → project. Cross-customer / missing → uniform `invoice_not_found`. |
| Surface | Server-only `listPortalSessionInvoices` / `readPortalSessionInvoice` + injectable `listInvoicesForMappedCustomer` / `readInvoiceForMappedCustomer`. **No HTTP route. No portal UI.** |
| Modules | `lib/stripe/invoice-read-auth.ts`, `invoice-read-types.ts`, `invoice-read-logic.ts`, `invoice-read-ops.ts`, `invoice-read-service.ts` |

**Allowlisted DTO (`PortalSafeStripeInvoice`):** `id`, `number`, `status`, `amountDue`, `amountPaid`, `amountRemaining`, `currency`, `createdAt`, `dueDate`, `paidAt`, `hostedInvoiceUrl`, `hostedPaymentUrl` (same hosted invoice URL), `hostedReceiptUrl` (always `null` — Stripe Invoice has no receipt URL field; do not invent).

**Status normalization:** Stripe `draft` / `open` / `paid` / `uncollectible` / `void` → same tokens; anything else → `unknown`. Batch 5C maps these to calm client labels.

**Amounts:** integer minor units (`Math.trunc`). **Dates:** Unix seconds → ISO string, or `null` when missing/invalid.

**Availability model:** `ready` | `empty` (successful zero invoices) | `unavailable` with codes including `read_not_authorized`, `session_required`, `browser_authority_rejected`, `missing_configuration`, `mode_disallowed`, `mode_mismatch`, `missing_billing_profile`, `missing_customer_mapping`, `invalid_customer_mapping`, `mapping_not_linked`, `provider_*`, `invoice_not_found`, `invalid_invoice_id`, `unexpected_failure`.

**Verifier:** `scripts/verify-phase5-batch-5b.ts` (`npm run verify:phase5-batch-5b`) — mocks/fixtures only; no live Stripe.

**Excluded (unchanged):** Stripe mutations; portal Billing UI; Billing nav; entitlement activation; customer create/link/repair; flipping broad execution gate; emails/notifications; live production invoice enumeration

### Batch 5C — Portal Billing Visibility

**Status:** ✅ Implemented in repository — verified (`npm run verify:phase5-batch-5c`). **Does not authorize Batch 5D.** Live Stripe reads remain unauthorized. No in-portal payment collection.

**Objective:** Replace `/portal/invoices` preview with secure active-client invoice experience using Batch 5B projection.

**Implemented:**

| Concern | Behavior |
|---------|----------|
| Route | `/portal/invoices` — authenticated server component; `getPortalSession()` → `loadPortalBillingForSession` → Batch 5B `listPortalSessionInvoices`. |
| Detail route | **Not implemented** — invoice/payment actions open Stripe-hosted URLs from the allowlisted DTO. |
| Composition | `lib/portal/billing/load.ts` (server-only). Presentation: `presentation.ts`, `status.ts`, `types.ts`. |
| Nav rule | Label **Billing** → `/portal/invoices`. Visible only when `isPortalBillingNavEligible` (valid linked test-mode Stripe customer mapping for the active `session.clientId`). No CES entitlement mutation. Direct route remains available and shows honest unavailable states when ineligible. |
| Account switch | Layout remounts `key={portal-client-${session.clientId}}`; billing nav eligibility re-resolved per active client. |
| Fields | Invoice number, status label, amounts (from integer minor units via `formatCents`), created/due/paid dates (`fmtPortalDate`), View invoice / Pay (open + URL only). No receipt action (`hostedReceiptUrl` null). |
| Status labels | Draft / Open / Paid / Uncollectible / Void / Status unavailable — calm, non-overdue language. |
| States | Ready list, empty, unavailable (mapping/mode/provider/session), segment `loading.tsx` for loading. |
| Theme | Semantic `--kxd-os-*` tokens only; works with existing Light/Dark `data-theme`. No isolated Billing theme system. |
| Verifier | `scripts/verify-phase5-batch-5c.ts` (`npm run verify:phase5-batch-5c`) |

**Excluded (unchanged):** Local payment forms; mutations; internal notes; Financial Command; entitlement or customer-mapping changes; invoice emails; receipt UI; live-mode reads; staff Billing (5D)

### Batch 5D — Staff Invoice Visibility

**Status:** Defined — **not authorized to start until 5C is reviewed/cleared**

**Objective:** Authorized operators see the same safe Stripe invoice projection per client on an existing commercial or Client Command surface.

**Excluded:** New finance platform; invoice mutation; automated customer repair; client communication

### Batch 5E — Billing and Work-Summary Context

**Status:** Optional — may be skipped if it adds duplication or weakens calm portal experience

**Objective:** Optionally place the approved monthly summary near Billing so clients understand completed monthly value without treating work items as invoice lines.

**In scope:** Presentation and navigation alignment only; clear separation of invoice facts vs work-summary facts; no accounting or causation claims unless supported by actual data.

---

## Acceptance criteria (phase-level)

1. Monthly summaries use reliable completion dates and cannot shift work into a month merely because a record was later edited.
2. Initial summaries include only approved completed deliverables and Website Review work in status `completed` (not `closed`/declined).
3. Internal-only, draft, incomplete, duplicate, placeholder, and system-noise records are excluded.
4. The summary never claims to be a complete Work Ledger, billable-hours report, or invoice breakdown.
5. Invoice reads are server-side, read-only, and isolated from financial-execution authorization.
6. Stripe customer identity comes from the active client’s server-side billing profile.
7. Portal users cannot select or forge Stripe customer IDs to access invoices.
8. Individual invoice access verifies that the invoice belongs to the active client’s mapped customer.
9. Only explicitly allowlisted invoice fields reach the portal.
10. Payment actions leave KXD OS for a Stripe-hosted surface.
11. KXD OS stores no card or bank data.
12. Missing mapping, missing configuration, provider denial, provider outage, and no invoices produce honest states.
13. No Phase 5 portal path can create, finalize, charge, refund, credit, void, or alter an invoice or subscription.
14. Existing Phases 35–37 commercial behavior remains intact.
15. Existing proposal checkout, lifecycle TEST invoicing, webhooks, and Financial Command remain intact.
16. Phase 5 works without GA4, Google Ads, Primal reporting entitlements, Primal OS, or the Primal website repository.
17. Cross-client and forged-ID verification passes.
18. Existing commercial and portal verifiers remain green.
19. Scoped lint, typecheck, and production build pass.
20. No production Stripe mutations or client communications occur during verification.

---

## Explicit exclusions

- Full accounting platform / Work Ledger / billable-hours product
- Automatic invoice creation, charging, dunning, refunds, credits, voids, tax calculation, revenue recognition, bookkeeping
- Subscriptions, Payment Links, saved payment-method vault inside KXD
- Wave / QuickBooks sync or dual-ledger
- Reopening Phases 35–37 activation / plan-change / custom-plan mutation scope
- Hosting Transitions automation and hosting billing workflows
- Primal Analytics / GA4 / Google Ads / Batch J.2B.2 / reporting entitlements / Primal website / Primal OS
- KXD-generated invoice emails, reminders, receipts, dunning
- Identity Vault, Approvals product, Connect / Support / Academy / Meetings / Social Studio
- Flipping `STRIPE_COMMERCIAL_EXECUTION_AUTHORIZED` for invoice reads
- Storing card or bank data in KXD
- Inventing completed work history
- Marking Phase 4 production-complete via this phase

---

## Dependencies and blockers

| Dependency / blocker | Notes |
|----------------------|-------|
| Phases 35–37 commercial foundations | Reuse; do not reopen |
| Phase 4 account context / isolation | Reuse; Phase 4 remains incomplete |
| Billing profile Stripe customer mapping | Required before real portal invoices (Batch 5C); mapping repair is ops, not Batch 5B scope |
| Narrow Stripe invoice read authorization | Batch 5B |
| Billing nav eligibility | Batch 5C: visible only with valid linked test-mode Stripe customer mapping |
| Monday Primal Analytics Ownership Audit | Top operator priority; independent of Phase 5 |
| Batch J.2B.2 / walkthrough / reporting pilot | Remain paused; not Phase 5 dependencies |

---

## Verification strategy (when implementing)

- Extend or add focused verify scripts per batch (work-summary dates; invoice-read isolation; portal billing eligibility).
- Keep existing commercial and portal verifiers green.
- Adversarial cross-client and forged-ID checks for invoice paths.
- `npx tsc --noEmit` and `npm run build` after implementation batches.
- No production Stripe mutations; no client communications during verification.

---

## Related surfaces (reference)

| Surface | Path / module |
|---------|----------------|
| Portal invoices shell | `/portal/invoices` |
| Work & Performance | `lib/portal/work-performance/` |
| Commercial agreements ops | `/admin/operations/commercial-agreements` |
| Billing profiles | `payload/collections/BillingProfiles.ts`, `lib/financial-command/billing-profile.ts` |
| Stripe commercial module | `lib/stripe/` |
| Lifecycle TEST billing | `lib/proposal-lifecycle/stripe-test/`, `/api/stripe/commercial-lifecycle-webhook` |
| CES launch safety | `lib/portal/ces-launch-safety.ts` |

---

*Phase 5 specification — Batches 5A–5C implemented and verified in repository; Batches 5D–5E unauthorized. Phase 5 as a whole is not complete. Clients cannot pay inside KXD OS; receipts are not shown while `hostedReceiptUrl` is null.*
