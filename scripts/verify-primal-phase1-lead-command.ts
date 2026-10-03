/**
 * Primal Phase 1 Lead Command — Build 1.
 * Pure composition + fixture checks + source contracts. No database writes,
 * no network calls. Safe to run without DATABASE_URI.
 *
 * Run: npx tsx scripts/verify-primal-phase1-lead-command.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  resolveLeadPresentationStage,
  leadPresentationStageLabel,
  leadStageStatusClass,
} from "../lib/client-command/leads/presentation.ts";
import {
  deriveLeadAttentionFlags,
  deriveLeadPrimaryAttention,
} from "../lib/client-command/leads/attention.ts";
import {
  applyLeadPresentationStage,
  SELECTABLE_LEAD_STAGES,
} from "../lib/client-command/leads/apply-stage.ts";
import {
  isAssignableLeadOwnerCandidate,
  isQaOrTestOwnerIdentity,
  isStudioOrAgencyEmail,
} from "../lib/client-command/leads/owner-eligibility.ts";
import { summarizeLeadAttentionCounts, summarizeLeadAttentionHeadline } from "../lib/client-command/leads/overview.ts";
import { isCrossClientLeak } from "../lib/managed-client-leads/isolation.ts";
import { getManagedClientLeadPolicy } from "../lib/acquisition-operations/policy.ts";
import "../lib/acquisition-operations/policies/register.ts";
import { CES_EXPERIENCE_MODULE_IDS, getCanonicalCapability } from "../lib/ces/modules/canonical.ts";
import { PRIMAL_EXPERIENCE_PROFILE } from "../lib/ces/profile/primal.ts";
import type { ClientInquiryRecord } from "../lib/managed-client-leads/types.ts";
import type { LeadPresentationStage } from "../lib/client-command/leads/types.ts";

const root = process.cwd();
let passed = 0;
let failed = 0;

function check(label: string, pass: boolean, detail?: string): void {
  if (pass) {
    passed += 1;
    console.log(`  ✔ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function baseInquiry(overrides: Partial<ClientInquiryRecord> = {}): ClientInquiryRecord {
  return {
    id: 1,
    inquiryKey: "primal-1",
    clientId: 1,
    clientKey: "primal-motorsports",
    channel: "form",
    receivedAt: new Date().toISOString(),
    destinationInbox: null,
    landingPage: null,
    campaign: null,
    sourceMedium: null,
    contactName: "Jordan Driver",
    contactEmail: "jordan@example.com",
    contactPhone: null,
    messageSummary: null,
    assignedOwnerId: null,
    firstRespondedAt: null,
    responseTimeSeconds: null,
    operationalStatus: "new",
    disposition: "none",
    leadQuality: "unreviewed",
    verificationState: "unverified",
    verifiedAt: null,
    verifiedById: null,
    qualificationState: "unreviewed",
    outcomeState: "open",
    outcomeNote: null,
    confirmedSaleReference: null,
    sourceSystem: null,
    sourceExternalId: null,
    sourceClientSiteEventId: null,
    reconciliationState: "not_applicable",
    googleConversionObserved: false,
    operatorNotes: null,
    nextFollowUpAt: null,
    programInterest: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    gclid: null,
    keyword: null,
    lostReason: null,
    wonRevenueCents: null,
    bookedProgram: null,
    locationId: null,
    assignedPortalOwnerId: null,
    ...overrides,
  };
}

console.log("\nPrimal Phase 1 Lead Command — Build 1\n");

// ── 1. Presentation stage mapping (deterministic, priority order) ────────

check(
  "New untouched inquiry resolves to NEW",
  resolveLeadPresentationStage(baseInquiry()) === "NEW",
);
check(
  "Acknowledged operational status resolves to CONTACTED",
  resolveLeadPresentationStage(baseInquiry({ operationalStatus: "acknowledged" })) ===
    "CONTACTED",
);
check(
  "Contacted disposition resolves to CONTACTED",
  resolveLeadPresentationStage(baseInquiry({ disposition: "contacted" })) === "CONTACTED",
);
check(
  "Nurturing disposition resolves to FOLLOW_UP",
  resolveLeadPresentationStage(baseInquiry({ disposition: "nurturing" })) === "FOLLOW_UP",
);
check(
  "Qualified qualificationState resolves to QUALIFIED (outranks disposition)",
  resolveLeadPresentationStage(
    baseInquiry({ disposition: "nurturing", qualificationState: "qualified" }),
  ) === "QUALIFIED",
);
check(
  "Won outcomeState resolves to WON (outranks everything)",
  resolveLeadPresentationStage(
    baseInquiry({ qualificationState: "qualified", outcomeState: "won" }),
  ) === "WON",
);
check(
  "Lost outcomeState resolves to LOST and outranks qualified",
  resolveLeadPresentationStage(
    baseInquiry({ qualificationState: "qualified", outcomeState: "lost" }),
  ) === "LOST",
);
check(
  "Every selectable stage has a human label",
  SELECTABLE_LEAD_STAGES.every((s) => leadPresentationStageLabel(s).length > 0),
);
check(
  "Every selectable stage maps to an existing kxd-ces-status token (no new color system)",
  SELECTABLE_LEAD_STAGES.every((s) => leadStageStatusClass(s).startsWith("kxd-ces-status--")),
);

// ── 2. Attention derivation (ownership, status, follow-up, now) ──────────

const NOW = new Date("2026-10-02T12:00:00.000Z");

check(
  "Brand-new untouched + unassigned lead carries both flags",
  (() => {
    const flags = deriveLeadAttentionFlags(baseInquiry(), NOW);
    return flags.includes("NEW_UNTOUCHED") && flags.includes("UNASSIGNED");
  })(),
);
check(
  "Assigned + acknowledged lead has no NEW_UNTOUCHED or UNASSIGNED flag",
  (() => {
    const flags = deriveLeadAttentionFlags(
      baseInquiry({ operationalStatus: "acknowledged", assignedPortalOwnerId: 7 }),
      NOW,
    );
    return !flags.includes("NEW_UNTOUCHED") && !flags.includes("UNASSIGNED");
  })(),
);
check(
  "Past nextFollowUpAt yields FOLLOW_UP_OVERDUE as primary attention",
  deriveLeadPrimaryAttention(
    baseInquiry({
      operationalStatus: "acknowledged",
      assignedPortalOwnerId: 7,
      nextFollowUpAt: "2026-09-01T09:00:00.000Z",
    }),
    NOW,
  ) === "FOLLOW_UP_OVERDUE",
);
check(
  "Near-future nextFollowUpAt (within 24h) yields FOLLOW_UP_DUE",
  deriveLeadPrimaryAttention(
    baseInquiry({
      operationalStatus: "acknowledged",
      assignedPortalOwnerId: 7,
      nextFollowUpAt: "2026-10-02T18:00:00.000Z",
    }),
    NOW,
  ) === "FOLLOW_UP_DUE",
);
check(
  "Closed/won lead never carries attention flags",
  deriveLeadAttentionFlags(
    baseInquiry({ outcomeState: "won", operationalStatus: "closed" }),
    NOW,
  ).length === 0,
);
check(
  "Closed/lost lead never carries attention flags",
  deriveLeadAttentionFlags(
    baseInquiry({ outcomeState: "lost", operationalStatus: "closed" }),
    NOW,
  ).length === 0,
);
check(
  "On-track lead (assigned, touched, no follow-up due) has NONE primary attention",
  deriveLeadPrimaryAttention(
    baseInquiry({ operationalStatus: "acknowledged", assignedPortalOwnerId: 7 }),
    NOW,
  ) === "NONE",
);

const attentionCounts = summarizeLeadAttentionCounts(
  [
    baseInquiry({ id: 1 }), // new + unassigned
    baseInquiry({
      id: 2,
      operationalStatus: "acknowledged",
      assignedPortalOwnerId: 7,
      nextFollowUpAt: "2026-09-01T09:00:00.000Z",
    }), // overdue
    baseInquiry({ id: 3, outcomeState: "won", operationalStatus: "closed" }), // excluded
  ],
  NOW,
);
check(
  "Overview counts aggregate across inquiries without inventing metrics",
  attentionCounts.total === 3 &&
    attentionCounts.newUntouched === 1 &&
    attentionCounts.unassigned === 1 &&
    attentionCounts.followUpOverdue === 1,
);
check(
  "Attention headline prioritizes overdue follow-ups",
  summarizeLeadAttentionHeadline(attentionCounts).toLowerCase().includes("overdue"),
);
check(
  "All-clear headline is calm, not an apology",
  summarizeLeadAttentionHeadline({
    total: 0,
    newUntouched: 0,
    unassigned: 0,
    followUpDue: 0,
    followUpOverdue: 0,
  }) === "All leads are on track",
);

// ── 3. Tenant isolation — requireTenant rejection uses the same pure guard
//    that update-lifecycle.ts wires into every portal-scoped write. ───────

check(
  "Cross-client inquiry is flagged as a leak against a different tenant",
  isCrossClientLeak({
    inquiryClientId: 1,
    inquiryClientKey: "primal-motorsports",
    requestedClientId: 2,
    requestedClientKey: "otp-carts",
  }) === true,
);
check(
  "Same-tenant inquiry is never flagged as a leak",
  isCrossClientLeak({
    inquiryClientId: 1,
    inquiryClientKey: "primal-motorsports",
    requestedClientId: 1,
    requestedClientKey: "primal-motorsports",
  }) === false,
);

const updateLifecycleSrc = read("lib/managed-client-leads/update-lifecycle.ts");
check(
  "updateClientInquiryLifecycle wires requireTenant to a forbidden rejection",
  updateLifecycleSrc.includes("input.requireTenant") &&
    updateLifecycleSrc.includes('code: "forbidden"') &&
    updateLifecycleSrc.includes("Inquiry is outside the authorized workspace."),
);

const updateSrc = read("lib/client-command/leads/update.ts");
check(
  "Client Command update wrapper always sets requireTenant on every action",
  updateSrc.includes("requireTenant: { clientId: input.tenant.clientId, clientKey: input.tenant.clientKey }"),
);
check(
  "Client Command update wrapper never sets verificationState, assignedOwnerId, confirmedSaleReference, reconciliationState, or googleConversionObserved",
  !updateSrc.includes("verificationState:") &&
    !updateSrc.includes("assignedOwnerId:") &&
    !updateSrc.includes("confirmedSaleReference:") &&
    !updateSrc.includes("reconciliationState:") &&
    !updateSrc.includes("googleConversionObserved:"),
);

const routeSrc = read("app/api/portal/leads/[id]/lifecycle/route.ts");
check(
  "Lifecycle route uses a strict action allowlist, not raw body field passthrough",
  routeSrc.includes("parseAction(body)") && !routeSrc.includes("body.verificationState"),
);

// ── 4. Stage → field mapping (presentation stage → MCI lifecycle fields) ──

check(
  "CONTACTED maps to disposition=contacted + operationalStatus=acknowledged",
  (() => {
    const patch = applyLeadPresentationStage("CONTACTED");
    return patch.disposition === "contacted" && patch.operationalStatus === "acknowledged";
  })(),
);
check(
  "FOLLOW_UP maps to disposition=nurturing + operationalStatus=in_progress",
  (() => {
    const patch = applyLeadPresentationStage("FOLLOW_UP");
    return patch.disposition === "nurturing" && patch.operationalStatus === "in_progress";
  })(),
);
check(
  "QUALIFIED maps to qualificationState=qualified only",
  (() => {
    const patch = applyLeadPresentationStage("QUALIFIED");
    return (
      patch.qualificationState === "qualified" &&
      patch.operationalStatus === undefined &&
      patch.outcomeState === undefined
    );
  })(),
);
check(
  "WON maps to outcomeState=won + operationalStatus=closed",
  (() => {
    const patch = applyLeadPresentationStage("WON");
    return patch.outcomeState === "won" && patch.operationalStatus === "closed";
  })(),
);
check(
  "LOST maps to outcomeState=lost + operationalStatus=closed",
  (() => {
    const patch = applyLeadPresentationStage("LOST");
    return patch.outcomeState === "lost" && patch.operationalStatus === "closed";
  })(),
);
check(
  "Stage → patch → re-resolved stage round-trips for every selectable stage",
  SELECTABLE_LEAD_STAGES.every((stage: LeadPresentationStage) => {
    if (stage === "NEW") return true; // NEW has no distinguishing positive field
    const patch = applyLeadPresentationStage(stage);
    const resolved = resolveLeadPresentationStage(baseInquiry(patch as Partial<ClientInquiryRecord>));
    return resolved === stage;
  }),
);

// ── 5. Policy — Primal must have portalModuleEnabled true ────────────────

const primalPolicy = getManagedClientLeadPolicy("primal-motorsports");
check(
  "Primal Motorsports has a registered, enabled Managed Client Lead policy",
  Boolean(primalPolicy) && primalPolicy?.enabled === true,
);
check(
  "Primal Motorsports policy has portalModuleEnabled = true (Build 1 activation)",
  primalPolicy?.portalModuleEnabled === true,
);
check(
  "leads is a registered CES experience module",
  (CES_EXPERIENCE_MODULE_IDS as readonly string[]).includes("leads"),
);
check(
  "Primal experience profile enables leads",
  (PRIMAL_EXPERIENCE_PROFILE.enabledModules as readonly string[]).includes("leads"),
);
check(
  "Primal experience profile has leads terminology",
  typeof PRIMAL_EXPERIENCE_PROFILE.terminology["nav.leads"] === "string" &&
    PRIMAL_EXPERIENCE_PROFILE.terminology["nav.leads"].length > 0,
);

// ── 5b. Owner eligibility (premium elevation — production leak fix) ───────

check(
  "Primal policy uses assignablePortalOwnerEmails allowlist (Tyler + JB)",
  Array.isArray(primalPolicy?.assignablePortalOwnerEmails) &&
    primalPolicy!.assignablePortalOwnerEmails!.length === 2 &&
    primalPolicy!.assignablePortalOwnerEmails!.includes("tyler.edwards@primalmotorsports.com") &&
    primalPolicy!.assignablePortalOwnerEmails!.includes("jb.layman@primalmotorsports.com"),
);

check(
  "Studio / agency emails are rejected as lead owners",
  isStudioOrAgencyEmail("matt@kreatebydesign.com") &&
    isStudioOrAgencyEmail("ops@kxd.local") &&
    !isStudioOrAgencyEmail("tyler.edwards@primalmotorsports.com"),
);

check(
  "QA / test / inventory identities are rejected as lead owners",
  isQaOrTestOwnerIdentity({ email: "qa@example.com", displayName: "Inventory QA 34B" }) &&
    isQaOrTestOwnerIdentity({ email: "matt+qa@primalmotorsports.com", displayName: "Matt (Test)" }) &&
    !isQaOrTestOwnerIdentity({
      email: "tyler.edwards@primalmotorsports.com",
      displayName: "Tyler",
    }),
);

const primalOwnerPolicy = primalPolicy!;
check(
  "Tyler is assignable under Primal policy",
  isAssignableLeadOwnerCandidate({
    email: "tyler.edwards@primalmotorsports.com",
    displayName: "Tyler",
    active: true,
    role: "client-member",
    policy: primalOwnerPolicy,
  }),
);
check(
  "JB Layman is assignable under Primal policy",
  isAssignableLeadOwnerCandidate({
    email: "jb.layman@primalmotorsports.com",
    displayName: "JB Layman",
    active: true,
    role: "client-owner",
    policy: primalOwnerPolicy,
  }),
);
check(
  "Matt · Primal Motorsports (KXD) is not assignable",
  !isAssignableLeadOwnerCandidate({
    email: "matt@kreatebydesign.com",
    displayName: "Matt · Primal Motorsports",
    active: true,
    role: "client-owner",
    policy: primalOwnerPolicy,
  }),
);
check(
  "Adam (non-allowlisted Primal email) is not assignable",
  !isAssignableLeadOwnerCandidate({
    email: "adam@primalmotorsports.com",
    displayName: "Adam",
    active: true,
    role: "client-member",
    policy: primalOwnerPolicy,
  }),
);
check(
  "Inactive allowlisted member is not assignable",
  !isAssignableLeadOwnerCandidate({
    email: "tyler.edwards@primalmotorsports.com",
    displayName: "Tyler",
    active: false,
    role: "client-member",
    policy: primalOwnerPolicy,
  }),
);

/**
 * Regression guard for the production owner leak: this is the real Primal
 * portal-client-memberships roster (client 1) as observed in production, where
 * the selector wrongly offered Matt Primal / Inventory QA / Adam / Matt / Matt
 * Test. Filtering it must leave exactly Tyler and JB Layman.
 */
const PRIMAL_PRODUCTION_ROSTER = [
  { email: "matt.primal@kxd.local", displayName: "Matt · Primal Motorsports", active: true },
  { email: "tyler.edwards@primalmotorsports.com", displayName: "Tyler", active: true },
  { email: "matt@kreatebydesign.com", displayName: "Matt", active: true },
  { email: "inventory.qa.34b@kxd.local", displayName: "Inventory QA 34B", active: true },
  { email: "adam.boatman@primalmotorsports.com", displayName: "Adam", active: false },
  { email: "matt.primal@kxd.local.com", displayName: "Matt (Test)", active: true },
  { email: "jb.layman@primalmotorsports.com", displayName: "JB Layman", active: true },
] as const;

const primalSelectableOwners = PRIMAL_PRODUCTION_ROSTER.filter((member) =>
  isAssignableLeadOwnerCandidate({
    email: member.email,
    displayName: member.displayName,
    active: member.active,
    // Every real Primal membership is client-member / canManageMembers=false.
    role: "client-member",
    canManageMembers: false,
    policy: primalOwnerPolicy,
  }),
).map((member) => member.displayName);

check(
  "Primal production roster resolves to exactly Tyler + JB Layman",
  primalSelectableOwners.length === 2 &&
    primalSelectableOwners.includes("Tyler") &&
    primalSelectableOwners.includes("JB Layman"),
  `resolved: ${primalSelectableOwners.join(", ") || "(none)"}`,
);

check(
  "Primal owner selector excludes every studio / QA / inactive identity",
  !primalSelectableOwners.some((name) =>
    ["Matt · Primal Motorsports", "Matt", "Inventory QA 34B", "Adam", "Matt (Test)"].includes(
      name,
    ),
  ),
);

/**
 * Other clients must be unaffected: with no allowlist configured, a real
 * elevated member of a different tenant stays assignable.
 */
const otpOwnerPolicy = getManagedClientLeadPolicy("otp-carts");
check(
  "Clients without an owner allowlist keep existing eligibility behaviour",
  otpOwnerPolicy != null &&
    otpOwnerPolicy.assignablePortalOwnerEmails === undefined &&
    isAssignableLeadOwnerCandidate({
      email: "owner@otpcarts.com",
      displayName: "OTP Owner",
      active: true,
      role: "client-owner",
      canManageMembers: true,
      policy: otpOwnerPolicy,
    }),
);

const leadsCapability = getCanonicalCapability("leads");
check(
  "Leads nav sits in headquarters (operational, not buried in website work)",
  leadsCapability?.portal?.navGroup === "headquarters" &&
    leadsCapability?.portal?.navOrder === 2,
);

const execWorkspaceSrc = read(
  "components/ces/executive-performance/CesExecutivePerformanceWorkspace.tsx",
);
check(
  "Executive Overview surfaces real leadAttention operational strip",
  execWorkspaceSrc.includes("leadAttention") &&
    execWorkspaceSrc.includes("OperationalAttentionStrip") &&
    execWorkspaceSrc.includes("Open leads"),
);

const signatureSrc = read(
  "components/ces/executive-performance/CesWorkspaceSignature.tsx",
);
check(
  "Workspace signature carries a single KXD credit (no Designed/Managed duplicate)",
  signatureSrc.includes("Managed by Kreate by Design") &&
    !/Designed by Kreate by Design/i.test(signatureSrc) &&
    (signatureSrc.match(/Managed by Kreate by Design/g) ?? []).length === 1 &&
    !/Designed by/i.test(signatureSrc),
);

check(
  "Workspace signature uses Client Dashboard (not Client Command)",
  signatureSrc.includes("Client Dashboard · Managed by Kreate by Design") &&
    !signatureSrc.includes("Client Command"),
);

const presentationSrc = read(
  "lib/ces/executive-performance/presentation.ts",
);
check(
  "Primal presentation names the client-facing product Client Dashboard",
  presentationSrc.includes('workspaceTitle: "Client Dashboard"') &&
    !presentationSrc.includes('workspaceTitle: "Command Center"') &&
    !presentationSrc.includes('workspaceEyebrow: "Client Command"') &&
    !presentationSrc.includes('workspaceEyebrow: "Primal Command"'),
);

const wonLostSrc = read("components/ces/leads/LeadLifecycleActions.tsx");
check(
  "Won/Lost terminal forms use aligned label/control/CTA rhythm",
  wonLostSrc.includes("kxd-lead-terminal__form") &&
    wonLostSrc.includes("kxd-lead-terminal__cta") &&
    wonLostSrc.includes("Confirm won") &&
    wonLostSrc.includes("Confirm lost"),
);

const lifecycleRouteSrc = read("app/api/portal/leads/[id]/lifecycle/route.ts");
check(
  "Won revenue rejects negative / non-finite amounts at portal parse boundary",
  lifecycleRouteSrc.includes("wonRevenueCents < 0") &&
    lifecycleRouteSrc.includes("Number.isFinite(wonRevenueCents)"),
);

check(
  "applyLeadCommandAction rejects negative won revenue with a safe message",
  updateSrc.includes("Revenue must be a non-negative amount") &&
    updateSrc.includes("wonRevenueCents < 0"),
);

// ── 6. System of record + architecture guards ─────────────────────────────

const ownersSrc = read("lib/client-command/leads/owners.ts");
const ownerEligibilitySrc = read("lib/client-command/leads/owner-eligibility.ts");
check(
  "Owners never hardcode a founder/staff email identity — sourced from memberships + policy filters",
  ownersSrc.includes("MEMBERSHIP_COLLECTION") &&
    ownerEligibilitySrc.includes("assignablePortalOwnerEmails") &&
    ownerEligibilitySrc.includes("isStudioOrAgencyEmail") &&
    ownerEligibilitySrc.includes("isQaOrTestOwnerIdentity") &&
    !/[a-z0-9._%+-]+@kreatebydesign\.com/i.test(ownersSrc) &&
    !/[a-z0-9._%+-]+@kreatebydesign\.com/i.test(ownerEligibilitySrc) &&
    !/\bjb@|\bjustin@|\bmatt@/i.test(ownersSrc) &&
    !/\bjb@|\bjustin@|\bmatt@/i.test(ownerEligibilitySrc),
);

const accessSrc = read("lib/client-command/leads/access.ts");
check(
  "Access manage gate checks policy.portalModuleEnabled OR elevated membership role OR studio operator",
  accessSrc.includes("policy.portalModuleEnabled") &&
    accessSrc.includes("hasElevatedMembershipRole") &&
    accessSrc.includes("isStudioPayloadOperator"),
);

const inquiriesCollectionSrc = read("payload/collections/ClientInquiries.ts");
check(
  "client-inquiries remains the single system of record — additive fields only",
  inquiriesCollectionSrc.includes("nextFollowUpAt") &&
    inquiriesCollectionSrc.includes("assignedPortalOwner") &&
    inquiriesCollectionSrc.includes("lostReason"),
);

const migrationSrc = read("migrations/20261002_primal_phase1_lead_command_foundation.ts");
const migrationUpBody =
  migrationSrc.split("export async function up(")[1]?.split("export async function down(")[0] ??
  "";
check(
  "Migration up() is additive (IF NOT EXISTS) and never drops/renames anything",
  migrationUpBody.includes("IF NOT EXISTS") &&
    !/DROP\s+(COLUMN|TABLE|CONSTRAINT|INDEX|TYPE)|RENAME\s+COLUMN/i.test(migrationUpBody),
);
check(
  "Migration down() never touches client_inquiries' pre-existing columns/table",
  !migrationSrc.includes('DROP TABLE IF EXISTS "client_inquiries"') &&
    !/ALTER TABLE "client_inquiries" RENAME/i.test(migrationSrc),
);

const migrationsIndexSrc = read("migrations/index.ts");
check(
  "Migration is registered in migrations/index.ts",
  migrationsIndexSrc.includes("20261002_primal_phase1_lead_command_foundation"),
);

if (failed > 0) {
  console.error(`\nFAILED ${failed}  passed ${passed}`);
  process.exit(1);
}
console.log(`\nOK — ${passed} checks`);
assert.equal(failed, 0);
