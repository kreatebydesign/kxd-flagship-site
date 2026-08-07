/**
 * Decision Archive backfill — Edition 1 permanent product decisions (P0-D).
 *
 * Institutional memory only. No invented roadmap. No Hall of Fame / Kill List / Future Bets.
 * Sources: PHASE-7-TODAY, PHASE-6-KXD-CONNECT, KXD-OS-PHILOSOPHY, KXD-OS-CONSTITUTION,
 * KXD-OS-ARCHITECTURE, KXD-PRODUCT-INTELLIGENCE, engineering brief.
 */

import type { DecisionObject } from "../contracts";
import { DOCTRINE_OBJECT_ID } from "./doctrine-seed";
import { PRODUCT_DNA_OBJECT_ID } from "./product-dna-seed";

const CREATED_AT = "2026-08-02T00:00:00.000Z";
const REVIEW_ANNUAL = "2027-08-02T00:00:00.000Z";
const REVIEW_SEMI = "2027-02-02T00:00:00.000Z";

function decision(
  partial: Omit<DecisionObject, "type" | "updateChannel" | "confidence" | "status"> & {
    status?: DecisionObject["status"];
    confidence?: DecisionObject["confidence"];
  },
): DecisionObject {
  return {
    ...partial,
    type: "decision",
    status: partial.status ?? "active",
    confidence: partial.confidence ?? "declared",
    updateChannel: "manual_approval",
  };
}

/**
 * Canonical Edition 1 Decision Archive entries.
 * IDs are stable — do not renumber casually.
 */
export const EDITION_1_DECISIONS: DecisionObject[] = [
  decision({
    id: "decision:founder-home-today",
    title: "Today is the sole founder home",
    ownerRole: "cpo",
    createdAt: CREATED_AT,
    lastReviewedAt: CREATED_AT,
    nextReviewAt: REVIEW_ANNUAL,
    evidenceIds: [],
    relatedObjectIds: [
      PRODUCT_DNA_OBJECT_ID,
      DOCTRINE_OBJECT_ID,
      "product:today",
      "decision:product-philosophy",
    ],
    summary: "Today is the only founder home; modules own depth; Executive Home is retired as home.",
    version: "1.0.0",
    detail: {
      statement:
        "Today (`/admin/operations/today`) is the single founder home. Executive Home and other aggregators are demoted destinations. Today owns attention; modules own depth.",
      decidedAt: "2026-08-02",
      domain: "product",
      context:
        "Edition 1 had multiple surfaces competing for home identity (Executive Dashboard, Operations Command, Founder Studio, Intelligence aggregators), which created morning uncertainty about where to start.",
      problem:
        "The founder could not begin every day in one calm place that answered what needed attention without becoming a second CRM, KPI wall, or AI chat.",
      reason:
        "A business operating system needs one permanent morning home. Competing homes manufacture urgency and fragment attention. Phase 7 Batches A–C established and enforced Today as sole home.",
      alternativesConsidered: [
        "Keep Executive Dashboard as home",
        "Keep Operations Command / “Command Center” as home",
        "Allow multiple persona homes for the founder",
        "Make Intelligence or Founder Studio the morning start",
      ],
      tradeoffs: [
        "Former home surfaces remain reachable but lose home semantics",
        "Ritual destinations (Focus / Review) stay modules, not homes",
        "Staff Home remains separate — founder and staff personas stay distinct",
      ],
      outcome: "validated",
      futureReviewAt: REVIEW_ANNUAL,
      successMetric:
        "Founder login and edition homeRoute always resolve to Today; no second product markets itself as home, cockpit, or command center.",
      decisionConfidence: "permanent",
      reviewPolicy:
        "Annual founder review. Reconsider only if Edition identity changes; do not reopen for feature convenience.",
      relatedRoadmapIds: ["phase-7-today"],
      relatedInventoryIds: [
        "product:today",
        "route:/admin/operations/today",
        "nav:ops:today",
      ],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["arch:founder-home-policy"],
      relatedProductIds: ["today", "executive", "platform"],
      sourceRefs: [
        "docs/PHASE-7-TODAY.md",
        "lib/admin/home-policy.ts",
        "docs/KXD-OS-CURRENT-STATE.md",
      ],
    },
  }),

  decision({
    id: "decision:client-command-hq",
    title: "Client Command remains permanent client headquarters",
    ownerRole: "cpo",
    createdAt: CREATED_AT,
    lastReviewedAt: CREATED_AT,
    nextReviewAt: REVIEW_ANNUAL,
    evidenceIds: [],
    relatedObjectIds: [
      DOCTRINE_OBJECT_ID,
      "product:client-command",
      "decision:founder-home-today",
    ],
    summary:
      "Client Command is the permanent per-client HQ — not renamed, not merged, purpose preserved.",
    version: "1.0.0",
    detail: {
      statement:
        "Client Command remains the permanent client headquarters. It is not renamed for home-policy cleanup and is not merged into Today or portal surfaces.",
      decidedAt: "2026-08-02",
      domain: "product",
      context:
        "Phase 7 home consolidation demoted many aggregator identities. Client Command could have been renamed or absorbed during that cleanup.",
      problem:
        "Per-client operational depth needs a durable HQ name and purpose that is distinct from the founder morning home.",
      reason:
        "Today owns founder attention; Client Command owns per-client depth. Renaming or merging would destroy relationship memory and operator vocabulary without reducing cognitive load.",
      alternativesConsidered: [
        "Rename Client Command to remove “Command” language",
        "Merge Client Command into Today",
        "Replace Client Command with portal Client HQ for staff",
        "Split Client Command into multiple specialist homes",
      ],
      tradeoffs: [
        "“Command” language remains for the client HQ while OS home identity stays Today-only",
        "Parallel Client Workspace paths still require later consolidation work",
      ],
      outcome: "validated",
      futureReviewAt: REVIEW_ANNUAL,
      successMetric:
        "Client Command remains the named staff HQ for a selected client; Today never becomes the per-client workspace.",
      decisionConfidence: "long_term",
      reviewPolicy:
        "Annual review during workspace consolidation. Name and purpose preserved unless a Decision explicitly supersedes.",
      relatedRoadmapIds: ["workspace-consolidation", "phase-7-today"],
      relatedInventoryIds: [
        "product:client-command",
        "route:/admin/operations/client-command",
      ],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["arch:client-command"],
      relatedProductIds: ["client-command", "today", "client-portal"],
      sourceRefs: [
        "docs/PHASE-7-TODAY.md",
        "docs/KXD-OS-ROADMAP.md",
        "docs/KXD-OS-ENGINEERING-BRIEF.md",
      ],
    },
  }),

  decision({
    id: "decision:shared-core",
    title: "Shared Core is the single source of truth",
    ownerRole: "cto",
    createdAt: CREATED_AT,
    lastReviewedAt: CREATED_AT,
    nextReviewAt: REVIEW_ANNUAL,
    evidenceIds: [],
    relatedObjectIds: [
      DOCTRINE_OBJECT_ID,
      "product:shared-core",
      "decision:product-intelligence",
    ],
    summary:
      "Shared Core (Payload + loaders) is the single source of truth — no duplicate business logic.",
    version: "1.0.0",
    detail: {
      statement:
        "Shared Core — Payload CMS and shared loaders (including Client Command loaders) — is the system of record and shared capability layer. No duplicate business logic or parallel data planes.",
      decidedAt: "2026-06-15",
      domain: "technical",
      context:
        "KXD OS accumulates business context across many surfaces. Parallel loaders and second backends would fracture truth and multiply maintenance.",
      problem:
        "Without a single Shared Core rule, features recreate queries, invent shadow stores, and disagree about client/work/commercial reality.",
      reason:
        "Product value is accumulated business context. That only compounds if facts have one owner and every layer reuses Shared Core instead of forking it.",
      alternativesConsidered: [
        "Per-feature data access without shared loaders",
        "Desktop/local second backend for Shared Core",
        "Duplicate intelligence queries that bypass Observer/loaders",
        "Client-specific forks of core collections",
      ],
      tradeoffs: [
        "Features must wait on Shared Core patterns instead of shipping isolated shortcuts",
        "Desktop and other shells wrap Shared Core — they do not replace it",
      ],
      outcome: "validated",
      futureReviewAt: REVIEW_ANNUAL,
      successMetric:
        "New features reuse Shared Core loaders; no second Payload/Neon/auth plane; architecture reviews catch parallel systems.",
      decisionConfidence: "permanent",
      reviewPolicy:
        "Architecture review annually and on any proposal for a second data plane. Permanent unless Edition boundaries change.",
      relatedRoadmapIds: ["shared-core", "runtime-architecture"],
      relatedInventoryIds: [
        "product:shared-core",
        "shared-core:payload",
        "shared-core:client-command",
      ],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["arch:shared-core"],
      relatedProductIds: ["shared-core", "platform"],
      sourceRefs: [
        "docs/KXD-OS-ARCHITECTURE.md",
        "docs/KXD-OS-ENGINEERING-BRIEF.md",
        "docs/KXD-OS-RUNTIME-ARCHITECTURE.md",
        ".cursor/rules/kxd-os-architecture.mdc",
      ],
    },
  }),

  decision({
    id: "decision:product-philosophy",
    title: "Edition 1 product philosophy encoded as Product DNA",
    ownerRole: "founder",
    createdAt: CREATED_AT,
    lastReviewedAt: CREATED_AT,
    nextReviewAt: REVIEW_ANNUAL,
    evidenceIds: [],
    relatedObjectIds: [
      PRODUCT_DNA_OBJECT_ID,
      DOCTRINE_OBJECT_ID,
      "decision:founder-home-today",
      "decision:ai-operating-philosophy",
    ],
    summary:
      "Confidence before information; calm; business before software; one truth; premium over feature count.",
    version: "1.0.0",
    detail: {
      statement:
        "Edition 1 product philosophy is Product DNA: confidence before information; reduce cognitive load; calm beats clutter; business before software; invisible complexity; one truth; premium over feature count.",
      decidedAt: "2026-08-02",
      domain: "product",
      context:
        "KXD OS must remain studio software — not a dashboard factory. Philosophy existed across Constitution, Philosophy, and Phase 7 rules without a single Product DNA object.",
      problem:
        "Without DNA, future builders treat principles as optional taste instead of identity constraints harder to change than Doctrine.",
      reason:
        "These principles define what KXD OS is. They must never become a feature backlog and must remain linked from Decisions so they cannot be rediscovered from chat.",
      alternativesConsidered: [
        "Keep philosophy only in markdown docs",
        "Treat philosophy as Doctrine only (easier to revise)",
        "Encode philosophy as roadmap themes",
        "Leave principles implicit in UI craft",
      ],
      tradeoffs: [
        "DNA changes require exceptional founder-protected updates",
        "Principles constrain feature ambition in favor of calm and confidence",
      ],
      outcome: "validated",
      futureReviewAt: REVIEW_ANNUAL,
      successMetric:
        "Product DNA object exists, is protected, links from Decisions, and never spawns roadmap items automatically.",
      decisionConfidence: "permanent",
      reviewPolicy:
        "Annual founder review. Changes require protected Update Engine channel — never automatic.",
      relatedRoadmapIds: [],
      relatedInventoryIds: ["product:today", "product:executive", "product:platform"],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["arch:experience"],
      relatedProductIds: ["today", "executive", "ces", "platform"],
      sourceRefs: [
        "docs/KXD-OS-PHILOSOPHY.md",
        "docs/KXD-OS-CONSTITUTION.md",
        "docs/PHASE-7-TODAY.md",
      ],
    },
  }),

  decision({
    id: "decision:connect-internal-first",
    title: "Connect is internal-first with portal isolation",
    ownerRole: "cpo",
    createdAt: CREATED_AT,
    lastReviewedAt: CREATED_AT,
    nextReviewAt: REVIEW_SEMI,
    evidenceIds: [],
    relatedObjectIds: [
      DOCTRINE_OBJECT_ID,
      "product:connect",
      "decision:shared-core",
    ],
    summary:
      "Connect ships internal-first; portal isolated; no notification spam; no duplicate communication engines.",
    version: "1.0.0",
    detail: {
      statement:
        "KXD Connect is internal-first and staff-proven before client exposure. Portal remains isolated. Messaging stays a distinct engine from Client Communications and message-kxd. No notification spam as an early product posture.",
      decidedAt: "2026-08-01",
      domain: "product",
      context:
        "Phase 6 established Connect as a secure multi-organization messaging platform with KXD as first organization — separately gated from Founding Client Early Access.",
      problem:
        "Premature portal exposure or merging communication engines would create trust risk, duplicate inboxes, and notification noise before the messaging foundation is proven.",
      reason:
        "Communication inside the OS must earn trust. Internal-first dogfood, portal isolation, and engine separation protect clients and prevent parallel chat systems.",
      alternativesConsidered: [
        "Expose Connect to portal clients in early batches",
        "Replace message-kxd immediately",
        "Merge Connect into Client Communications",
        "Ship dock/Buddy List/notifications before foundation readiness",
        "Block Founding Client Early Access on Connect readiness",
      ],
      tradeoffs: [
        "Clients do not get Connect until later authorized gates",
        "Operators temporarily live with multiple communication surfaces",
        "Notification center and dock remain future experience, not current promise",
      ],
      outcome: "validated",
      futureReviewAt: REVIEW_SEMI,
      successMetric:
        "Connect stays feature-flagged/internal until authorized; portal identities denied; Client Communications and message-kxd remain distinct until a Decision replaces them.",
      decisionConfidence: "long_term",
      reviewPolicy:
        "Semi-annual review and at each Connect readiness gate (pilot / commercial). Portal exposure requires a new Decision.",
      relatedRoadmapIds: ["phase-6-kxd-connect"],
      relatedInventoryIds: [
        "product:connect",
        "module:connect",
        "feature:kxd-connect",
      ],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["arch:connect"],
      relatedProductIds: ["connect", "client-portal", "platform"],
      sourceRefs: [
        "docs/PHASE-6-KXD-CONNECT.md",
        "docs/KXD-OS-CURRENT-STATE.md",
        "docs/PHASE-6-CONNECT-LOCAL-DOGFOOD-RUNBOOK.md",
      ],
    },
  }),

  decision({
    id: "decision:connected-storage",
    title: "Connected storage via Drive, Dropbox, OneDrive — no native KXD cloud drive",
    ownerRole: "cto",
    createdAt: CREATED_AT,
    lastReviewedAt: CREATED_AT,
    nextReviewAt: REVIEW_SEMI,
    evidenceIds: [],
    relatedObjectIds: [
      DOCTRINE_OBJECT_ID,
      "product:platform",
      "decision:shared-core",
    ],
    summary:
      "Client file collaboration uses connected external storage; KXD is not a general-purpose cloud drive.",
    version: "1.0.0",
    detail: {
      statement:
        "KXD OS uses connected storage — Google Drive, Dropbox, and OneDrive — for client file collaboration. KXD does not build a native general-purpose cloud storage product.",
      decidedAt: "2026-08-02",
      domain: "product",
      context:
        "Studios already keep client assets in Drive/Dropbox/OneDrive. Building a competing KXD drive would create sync risk, storage cost, and another system of record for files.",
      problem:
        "Operators need files near work without making KXD responsible for being the world’s file system.",
      reason:
        "Shared Core owns business truth; external drives own bulk creative files. Connected storage preserves client habits and avoids a parallel cloud product that would dilute Edition 1 focus.",
      alternativesConsidered: [
        "Build native KXD cloud storage / drive product",
        "Store all client assets only in Vercel Blob as the collaboration drive",
        "Ignore file systems and keep links only in notes forever",
        "Force all clients onto a single vendor",
      ],
      tradeoffs: [
        "File UX depends on external providers and connection quality",
        "App-specific media (e.g. review attachments) may still use platform blob storage without becoming a Drive competitor",
        "Connected Files remains a Future Bet until authorized — this Decision sets the storage philosophy, not a shipped feature",
      ],
      outcome: "pending",
      futureReviewAt: REVIEW_SEMI,
      successMetric:
        "No native KXD cloud-drive product ships; file collaboration strategy stays provider-connected; Future Bet promotion still requires a separate Decision.",
      decisionConfidence: "long_term",
      reviewPolicy:
        "Semi-annual strategy review. Shipping Connected Files requires Decision + authorized roadmap — this archive entry is philosophy, not delivery authorization.",
      relatedRoadmapIds: [],
      relatedInventoryIds: [
        "product:platform",
        "integration:vercel",
        "integration:google-workspace",
      ],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["arch:integrations"],
      relatedProductIds: ["platform", "website-review", "client-command"],
      sourceRefs: [
        "docs/KXD-PRODUCT-INTELLIGENCE.md",
        "docs/KXD-OS-PHILOSOPHY.md",
        "lib/product-intelligence/inventory/ownership.ts",
      ],
    },
  }),

  decision({
    id: "decision:ai-operating-philosophy",
    title: "AI operates inside the experience — not as homepage or chatbot",
    ownerRole: "cpo",
    createdAt: CREATED_AT,
    lastReviewedAt: CREATED_AT,
    nextReviewAt: REVIEW_ANNUAL,
    evidenceIds: [],
    relatedObjectIds: [
      PRODUCT_DNA_OBJECT_ID,
      DOCTRINE_OBJECT_ID,
      "decision:product-philosophy",
      "decision:founder-home-today",
    ],
    summary:
      "AI assists and reduces work; it is not the homepage, not a chatbot, and should disappear into the experience.",
    version: "1.0.0",
    detail: {
      statement:
        "AI in KXD OS operates, assists, and reduces work inside workflows. AI is not the homepage. AI is not a chatbot. Studio intelligence should disappear into the experience.",
      decidedAt: "2026-06-01",
      domain: "ux",
      context:
        "Constitution and Philosophy reject AI chrome and chatbot identity. Today is explicitly not an AI chat home.",
      problem:
        "AI surfaces that become destinations create novelty without reclaiming founder time and compete with calm operating rhythm.",
      reason:
        "Intelligence must be moment-first and evidence-bound. The OS quietly prepares work; it does not ask the founder to operate a separate AI layer.",
      alternativesConsidered: [
        "AI chatbot as primary OS interface",
        "AI homepage / assistant dock as morning start",
        "Label every assisted action as “AI” chrome",
        "Open-ended chat without evidence or commit paths",
      ],
      tradeoffs: [
        "Less visible “AI product” marketing inside the OS",
        "Assistance must ship with evidence and a path to action",
        "Some users must learn that help appears in context, not in a chat tab",
      ],
      outcome: "validated",
      futureReviewAt: REVIEW_ANNUAL,
      successMetric:
        "No AI chatbot home; Today remains non-chat; assisted features use studio language and evidence; Assistant remains a Future Bet until Decision + authorization.",
      decisionConfidence: "permanent",
      reviewPolicy:
        "Annual review with Constitution. Any AI homepage or chatbot-as-home proposal is a Doctrine exception requiring founder approval.",
      relatedRoadmapIds: [],
      relatedInventoryIds: ["product:ai", "product:today", "capability:ai"],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["arch:experience", "arch:intelligence"],
      relatedProductIds: ["ai", "today", "executive"],
      sourceRefs: [
        "docs/KXD-OS-CONSTITUTION.md",
        "docs/KXD-OS-PHILOSOPHY.md",
        "docs/PHASE-7-TODAY.md",
      ],
    },
  }),

  decision({
    id: "decision:product-intelligence",
    title: "Establish KXD Product Intelligence as institutional memory",
    ownerRole: "founder",
    createdAt: CREATED_AT,
    lastReviewedAt: CREATED_AT,
    nextReviewAt: REVIEW_ANNUAL,
    evidenceIds: [],
    relatedObjectIds: [
      PRODUCT_DNA_OBJECT_ID,
      DOCTRINE_OBJECT_ID,
      "decision:shared-core",
      "decision:product-philosophy",
    ],
    summary:
      "Product Intelligence is the control plane for building KXD OS — evidence, decisions, and continuity beyond chat.",
    version: "1.0.0",
    detail: {
      statement:
        "KXD Product Intelligence is established as the permanent internal control plane for product, engineering, UX, roadmap, and company continuity. Chat is not memory.",
      decidedAt: "2026-08-02",
      domain: "product",
      context:
        "Product memory was fragmented across docs, rules, phase specs, verifiers, chat history, and founder instinct — causing Conversation → Memory → Guess → Build.",
      problem:
        "Without institutional memory, KXD OS cannot be understood, evaluated, or continued without conversation history or founder presence.",
      reason:
        "Long-term company continuity requires structured, owned, versioned, evidence-backed product knowledge. Product Intelligence exists so someone can understand and continue KXD OS without rediscovering why it became what it became.",
      alternativesConsidered: [
        "Keep relying on chat history and founder memory",
        "Use a wiki of markdown pages without owners or evidence",
        "Treat phase docs alone as sufficient product memory",
        "Defer institutional memory until after more features ship",
      ],
      tradeoffs: [
        "Building the OS of the OS consumes sequencing capacity before some product features",
        "Agents and humans must load Product Intelligence before proposing major changes",
      ],
      outcome: "validated",
      futureReviewAt: REVIEW_ANNUAL,
      successMetric:
        "A CPO/CTO/engineer can answer “why does KXD OS work this way?” from Decision Archive + inventory without chat archaeology; 30-day continuity test holds.",
      decisionConfidence: "permanent",
      reviewPolicy:
        "Annual review of Product Intelligence mission. Architecture (P0-A) is immutable; contracts and inventory evolve through authorized batches only.",
      relatedRoadmapIds: [
        "product-intelligence-p0a",
        "product-intelligence-p0b",
        "product-intelligence-p0c",
        "product-intelligence-p0d",
      ],
      relatedInventoryIds: [
        "product:platform",
        "script:verify-product-intelligence-p0b",
        "script:verify-product-intelligence-p0c",
      ],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["arch:product-intelligence"],
      relatedProductIds: ["platform"],
      sourceRefs: [
        "docs/KXD-PRODUCT-INTELLIGENCE.md",
        "lib/product-intelligence/law.ts",
        "docs/KXD-OS-CURRENT-STATE.md",
      ],
    },
  }),

  decision({
    id: "decision:client-site-intelligence-v1",
    title: "Client Site Intelligence V1 — OTP Carts reference approval",
    ownerRole: "founder",
    createdAt: "2026-08-07T18:30:00.000Z",
    lastReviewedAt: "2026-08-07T18:30:00.000Z",
    nextReviewAt: "2027-02-07T00:00:00.000Z",
    evidenceIds: [
      "evidence:client-site-intelligence-pre-build-gate",
      "evidence:otp-carts-website-lead-attribution-phase-1",
      "evidence:otp-carts-seo-foundation-batch-1-production",
      "evidence:otp-carts-gsc-site-url-config-in-kxd-os",
      "evidence:otp-carts-launch-readiness-gate",
      "evidence:activity-engine-canonical-relationship-memory",
    ],
    relatedObjectIds: [
      PRODUCT_DNA_OBJECT_ID,
      DOCTRINE_OBJECT_ID,
      "capability:client-site-intelligence",
      "architecture:client-site-event-ingest",
      "roadmap:client-site-intelligence-v1",
      "roadmap:otp-carts-seo-organic-growth",
      "debt:client-visible-activity-timeline-unification",
      "kill:website-lead-crm",
      "kill:auto-commission-on-website-lead-submit",
      "kill:client-portal-commit-deploy-noise-feed",
    ],
    summary:
      "PROCEED WITH CHANGES — Human Decision approved Client Site Intelligence V1: generalized ClientSiteEvent, OTP Carts first reference, leads≠CRM, commission orthogonal + human-confirmed only ($300), Activity Engine as work memory, parallel OTP SEO. NOT implemented.",
    version: "1.0.0",
    detail: {
      statement:
        "Client Site Intelligence V1 is approved as a major Shared Core capability with OTP Carts (otp-carts) as the first production reference. APPROVED: generalized ClientSiteEvent; website leads as attribution/events not CRM; lead capture, confirmed sale, commission obligation, payment, and service remain orthogonal; OTP sale attribution requires explicit human confirmation; OTP commission is $300 per human-confirmed website-attributed cart sale; no commission becomes due merely from form submission; Activity Engine remains canonical relationship/work memory; Work & Performance/client portal consume that memory rather than a second monthly-work ledger; July/August 2026 OTP work will be manually and honestly backfilled from evidence; future client-visible automated work milestones require trustworthy evidence and visibility controls; developer noise must not become client-facing work; OTP SEO/content growth proceeds independently in parallel. EXPLICITLY NOT APPROVED: website-lead CRM; automatic commission on form submission; Stripe auto-invoicing commissions; parallel monthly-work database/system; broad GitHub/Vercel/GSC/GA4 client-visible auto-ingestion; event-bus/queue infrastructure without demonstrated need; merging OTP Carts with On Track Performance; using Product Intelligence or Continuous Intelligence as the operational lead store.",
      decidedAt: "2026-08-07",
      domain: "product",
      context:
        "OTP Carts production website (https://www.otpcarts.com) has SEO Foundation Batch 1 and Website Lead Attribution Phase 1 (external commit 88da435f647e5d24be7a5f49ff739f2dcb552a2d) with recordWebsiteLead() as the future KXD OS ingest seam. Business need: organic visibility, attributable website→sale→$300 bonus, light OTP ops, Don-visible monthly KXD value via client portal — without CRM gravity or developer-noise theater. MAJOR_CAPABILITY_PI_GATE requires this Human Decision before Shared Core ingest implementation.",
      problem:
        "Without a generalized client-site intelligence architecture, OTP work becomes a silo; website leads cannot become trustworthy attribution; commission can be incorrectly auto-assumed; and monthly client value risks a second ledger or vanity activity feed.",
      reason:
        "The smallest correct V1 that strengthens the whole platform is a Shared Core ClientSiteEvent contract with OTP as reference, a minimal human-confirmed sale→commission lifecycle, Activity Engine reuse for work memory, and a parallel SEO growth track — while refusing CRM, auto-commission, parallel monthly systems, and client-visible engineering noise.",
      alternativesConsidered: [
        "Build an OTP-only lead/commission silo in KXD OS",
        "Treat website leads as sales-leads CRM pipeline",
        "Auto-mark commission due on form submit",
        "Create a parallel monthly-work database for Don's portal",
        "Pipe GitHub/Vercel/GSC/GA4 noise into the client portal",
        "Block OTP SEO work until ingest is complete",
        "Store operational leads inside Product Intelligence / Continuous Intelligence",
      ],
      tradeoffs: [
        "V1 will not yet automate multi-source work evidence into client-visible milestones",
        "Human sale confirmation remains required before commission due",
        "Timeline unification debt remains open — must not invent a third memory plane",
        "GSC indexing/performance reality is not fully evidenced in this repository and must not be fabricated",
      ],
      outcome: "validated",
      futureReviewAt: "2027-02-07T00:00:00.000Z",
      successMetric:
        "After csi-v1-a→d: OTP website leads ingest idempotently into Shared Core; human confirmation gates commission_due; Activity Engine carries curated monthly value (including honest July/August 2026 backfill); portal surfaces meaningful business value only; OTP SEO track continues; no CRM, no auto-commission, no parallel monthly ledger, no PI/CI lead store.",
      decisionConfidence: "long_term",
      reviewPolicy:
        "Review after csi-v1-d and before authorizing broad multi-source client-visible auto-ingestion or additional client-site adapters beyond OTP. Any expansion into CRM, auto-commission, or queue bus requires a new Decision.",
      relatedRoadmapIds: [
        "roadmap:client-site-intelligence-v1",
        "roadmap:otp-carts-seo-organic-growth",
      ],
      relatedInventoryIds: ["capability:client-site-intelligence"],
      relatedProductDnaIds: [PRODUCT_DNA_OBJECT_ID],
      relatedDoctrineIds: [DOCTRINE_OBJECT_ID],
      relatedArchitectureIds: ["architecture:client-site-event-ingest"],
      relatedProductIds: ["client-site-intelligence", "platform", "otp-carts"],
      sourceRefs: [
        "lib/product-intelligence/client-site-intelligence/",
        "lib/activity-engine/",
        "lib/portal/work-performance/",
        "lib/client-launch/otp-carts-readiness.ts",
        "docs/CLIENT-EXPERIENCE-SYSTEM-ARCHITECTURE.md",
        "docs/KXD-OS-ROADMAP.md",
        "https://www.otpcarts.com",
        "88da435f647e5d24be7a5f49ff739f2dcb552a2d",
      ],
    },
  }),
];

export const EDITION_1_DECISION_IDS = EDITION_1_DECISIONS.map((d) => d.id);
