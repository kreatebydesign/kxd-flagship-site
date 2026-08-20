/**
 * Phase A+B share/delivery verification — pure logic + source contracts.
 * Does not connect to Neon, print tokens, email, charge, or mutate proposals.
 *
 * Run: npx tsx scripts/verify-proposal-share-workflow.ts
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseHttpsBookingUrl, publicBookingUrl } from "../lib/proposal-builder/booking-url.ts";
import {
  canTransitionProposal,
  isShareableProposalStatus,
} from "../lib/proposal-builder/lifecycle.ts";
import {
  isProtectedLiveCommercialProposal,
  matchesProtectedLiveDealIdentity,
} from "../lib/proposal-builder/protection.ts";
import {
  createShareLinkRecord,
  hashShareToken,
  isHashedPublicTokenAuthorized,
} from "../lib/proposal-builder/share.ts";
import {
  buildOperatorShareState,
  isAlreadyMarkedSent,
  nextStatusOnMarkSent,
  nextStatusOnPublicView,
  normalizeManualDelivery,
  shareActionRotatesToken,
  shouldCreateShareToken,
  shouldWriteSentAtOnPublicView,
} from "../lib/proposal-builder/share-workflow.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function readRepo(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function sourceHas(rel: string, pattern: RegExp): boolean {
  return pattern.test(readRepo(rel));
}

function sourceLacks(rel: string, pattern: RegExp): boolean {
  return !pattern.test(readRepo(rel));
}

function main() {
  console.log("\nProposal share workflow verification (Phases A + B)\n");

  const shareRoute = "app/api/admin/proposal-builder/[id]/share/route.ts";
  const shareServices = "lib/proposal-builder/services.ts";
  const workspace = "components/admin/sales/ProposalWorkspaceScreen.tsx";
  const publicRoute = "app/api/proposal/[publicToken]/builder/route.ts";
  const getRoute = "app/api/admin/proposal-builder/[id]/route.ts";

  // 1. Prepare Share Link does not email
  check(
    "1. Prepare Share Link does not email",
    sourceHas(shareRoute, /action === "prepare"/) &&
      sourceLacks(shareRoute, /nodemailer|resend|sendMail|sendEmail|@sendgrid/i) &&
      sourceHas(shareServices, /export async function prepareProposalShareLink/) &&
      sourceLacks(shareServices, /nodemailer|resend|sendMail|sendEmail/i),
  );

  // 2. Prepare does not set sent or sentAt
  const prepareFn = readRepo(shareServices).match(
    /export async function prepareProposalShareLink[\s\S]*?export async function replaceProposalShareLink/,
  )?.[0] ?? "";
  check(
    "2. Prepare Share Link does not set sent or sentAt",
    /created: false/.test(prepareFn) &&
      !/\bstatus:\s*"sent"/.test(prepareFn) &&
      !/\bsentAt:/.test(prepareFn),
  );

  // 3–4. Copy / Open never rotate
  check("3. Copy does not rotate", shareActionRotatesToken("copy") === false);
  check("4. Open does not rotate", shareActionRotatesToken("open") === false);
  check(
    "Copy/Open are client-only (no share POST)",
    sourceHas(workspace, /async function copyShareLink/) &&
      sourceHas(workspace, /navigator\.clipboard\.writeText\(shareUrl\)/) &&
      sourceHas(workspace, />[\s\n]*Open Proposal/) &&
      sourceLacks(workspace, /copyShareLink[\s\S]{0,400}postShare/),
  );

  // 5. Mark as Sent does not rotate
  check("5. Mark as Sent does not rotate", shareActionRotatesToken("mark-sent") === false);
  const markFn = readRepo(shareServices).match(
    /export async function markProposalDelivered[\s\S]*?export async function markProposalShared/,
  )?.[0] ?? "";
  const markWrite = markFn.match(/payload\.update\([\s\S]*?overrideAccess: true,/)?.[0] ?? "";
  check(
    "Mark as Sent preserves token fields",
    /\bsentAt: delivery\.deliveredAt/.test(markWrite) &&
      !/createShareLinkRecord/.test(markWrite) &&
      !/publicTokenHash/.test(markWrite) &&
      !/shareLinks/.test(markWrite),
  );

  // 6. Repeated Mark as Sent is idempotent
  check(
    "6. Repeated Mark as Sent is idempotent (sentAt)",
    isAlreadyMarkedSent({ sentAt: "2026-08-01T00:00:00.000Z", manualDelivery: null }) === true,
  );
  check(
    "6b. Repeated Mark as Sent is idempotent (manualDelivery)",
    isAlreadyMarkedSent({
      sentAt: null,
      manualDelivery: {
        method: "email",
        deliveredAt: "2026-08-01T00:00:00.000Z",
        recordedAt: "2026-08-01T00:00:00.000Z",
        activityDedupeKey: "proposal-manual-delivery:9",
      },
    }) === true,
  );
  check(
    "6c. Unmarked proposals are not treated as sent",
    isAlreadyMarkedSent({ sentAt: null, manualDelivery: null }) === false,
  );
  check(
    "6d. Sales-activity write is skipped when one already exists",
    sourceHas(shareServices, /activityType: \{ equals: "proposal-sent" \}/) &&
      sourceHas(shareServices, /existingActivities\.docs\.length === 0 && leadId/),
  );

  // 7. Replace requires explicit confirmation
  check("7. Replace Share Link requires explicit confirmation", shareActionRotatesToken("replace") === true);
  check(
    "7b. Server rejects replace without confirmReplace === true",
    sourceHas(shareServices, /if \(input\.confirmReplace !== true\)/) &&
      sourceHas(workspace, /I understand replacing the link will invalidate/),
  );

  // 8. Replacing invalidates the previous link
  check(
    "8. Replacing invalidates the previous link",
    sourceHas(shareServices, /link\.revokedAt \? link : \{ \.\.\.link, revokedAt: now \}/),
  );

  // 9. Accepted proposals cannot rotate or re-share
  check(
    "9. Accepted proposals cannot rotate or re-share",
    !isShareableProposalStatus("accepted-contract-pending") &&
      !canTransitionProposal("accepted-contract-pending", "sent") &&
      sourceHas(shareServices, /Accepted or terminal proposals cannot be re-shared/) &&
      sourceHas(shareServices, /Accepted or terminal proposals cannot rotate a share link/),
  );

  // 10. Existing V1 public links remain resolvable
  const { record, rawToken } = createShareLinkRecord({ version: 1 });
  check(
    "10. Existing V1 hashed token authorizes without shareLinks rows",
    isHashedPublicTokenAuthorized({
      providedToken: rawToken,
      publicTokenHash: record.tokenHash,
      revoked: false,
      shareLinks: [],
    }) === true,
  );
  check(
    "10b. Revoked hash-only token is rejected",
    isHashedPublicTokenAuthorized({
      providedToken: rawToken,
      publicTokenHash: record.tokenHash,
      revoked: true,
      shareLinks: [],
    }) === false,
  );
  check(
    "10c. Wrong token is rejected",
    isHashedPublicTokenAuthorized({
      providedToken: "not-the-token",
      publicTokenHash: record.tokenHash,
      revoked: false,
      shareLinks: [],
    }) === false,
  );
  check(
    "10d. Prepare does not rotate an existing unrecoverable hash",
    shouldCreateShareToken({
      shareLinks: [],
      publicTokenHash: record.tokenHash,
      revoked: false,
    }) === false,
  );
  check("10e. Hash is SHA-256 of the raw token", record.tokenHash === hashShareToken(rawToken));

  // 11–12. Booking URL
  check("11. Blank booking URL hides the public CTA", publicBookingUrl("") === null);
  check("11b. Whitespace booking URL hides the public CTA", publicBookingUrl("   ") === null);
  check("12. HTTP booking URL is rejected", parseHttpsBookingUrl("http://calendly.com/x").ok === false);
  check("12b. Invalid booking URL is rejected", parseHttpsBookingUrl("not-a-url").ok === false);
  check(
    "12c. HTTPS booking URL is accepted",
    parseHttpsBookingUrl("https://calendly.com/kxd/review").ok === true,
  );
  check(
    "12d. Invalid public booking URL fails closed (hidden)",
    publicBookingUrl("javascript:alert(1)") === null && publicBookingUrl("http://example.com") === null,
  );
  check(
    "12e. Credentials in booking URL are rejected",
    parseHttpsBookingUrl("https://user:pass@calendly.com/x").ok === false,
  );

  // 13. Anonymous users receive 401/403 on admin routes
  check(
    "13. Share route requires admin auth (401 when unauthenticated)",
    sourceHas(shareRoute, /requirePayloadAdminApi/) &&
      sourceHas("lib/admin/auth.ts", /status: 401/) &&
      sourceHas(getRoute, /requirePayloadAdminApi/),
  );

  // 14. Forged proposal/lead relations are rejected
  check(
    "14. Forged lead/client IDs are rejected server-side",
    sourceHas(shareServices, /assertRelatedRecordExists\("sales-leads"/) &&
      sourceHas(shareServices, /assertRelatedRecordExists\("clients"/) &&
      sourceHas(shareServices, /throw new ProposalBuilderError\(`Invalid \$\{label\}\.`/),
  );
  check(
    "14b. Share actions require a finite positive proposal id",
    sourceHas(shareRoute, /if \(!id \|\| !Number\.isFinite\(id\) \|\| id <= 0\)/),
  );

  // 15. Existing sent proposals are not mutated by page load or this migration
  const migration = readRepo("migrations/20260901_proposal_manual_delivery.ts");
  const getFn = readRepo(getRoute).match(
    /export async function GET[\s\S]*?export async function PATCH/,
  )?.[0] ?? "";
  check(
    "15. GET does not update proposal rows",
    /operatorShareStateFromProposal/.test(getFn) &&
      !/payload\.update/.test(getFn) &&
      !/saveProposalDraft/.test(getFn),
  );
  check(
    "15b. Migration is additive JSON only (no backfill)",
    /ADD COLUMN IF NOT EXISTS "manual_delivery" jsonb/.test(migration) &&
      !/UPDATE\s+"proposals"/i.test(migration) &&
      !/sent_at/i.test(migration),
  );
  check("15c. Page load / view / approve / mark-sent do not rotate", shareActionRotatesToken("view") === false);
  check("15d. Approve does not rotate", shareActionRotatesToken("approve") === false);
  check("15e. Prepare does not rotate an existing link", shareActionRotatesToken("prepare") === false);

  // 16. Public view tracking remains functional
  check(
    "16. Public view tracking remains functional",
    sourceHas(publicRoute, /action === "view"/) &&
      sourceHas(shareServices, /export async function recordPublicView/) &&
      nextStatusOnPublicView("sent") === "viewed" &&
      nextStatusOnPublicView("approved-for-sharing") === "approved-for-sharing" &&
      shouldWriteSentAtOnPublicView() === false,
  );
  const viewFn = readRepo(shareServices).match(
    /export async function recordPublicView[\s\S]*?export async function submitChangeRequest/,
  )?.[0] ?? "";
  check("16b. Public view does not write sentAt", !/\bsentAt:/.test(viewFn));

  // 17. Request Changes and Accept remain functional
  check(
    "17. Request Changes and Accept Proposal remain functional",
    sourceHas(publicRoute, /action === "request-changes"/) &&
      sourceHas(publicRoute, /action === "accept"/) &&
      sourceHas(shareServices, /export async function submitChangeRequest/) &&
      sourceHas(shareServices, /export async function acceptProposal/) &&
      canTransitionProposal("approved-for-sharing", "revision-requested") &&
      canTransitionProposal("approved-for-sharing", "accepted-contract-pending") &&
      canTransitionProposal("viewed", "accepted-contract-pending"),
  );

  // 18. No email / Stripe / contract / Won / client / invitation side effects on share actions
  check(
    "18. Share route has no Stripe, contract, Won, or invitation side effects",
    sourceLacks(shareRoute, /stripe|executeProposalConversion|createCheckout|invite|entitlement/i) &&
      sourceHas(shareRoute, /action === "approve"/) &&
      sourceHas(shareRoute, /action === "prepare"/) &&
      sourceHas(shareRoute, /action === "replace"/) &&
      sourceHas(shareRoute, /action === "mark-sent"/),
  );
  check(
    "18b. Prepare data write omits status/sentAt",
    /publicTokenHash: shareLink\.tokenHash/.test(prepareFn) && !/\bstatus:/.test(prepareFn),
  );

  // Operator truthfulness
  check(
    "Operator UI renamed Send Proposal → Prepare Share Link",
    sourceHas(workspace, /Prepare Share Link/) && sourceLacks(workspace, /Send Proposal/),
  );
  check(
    "Protected proposals render a locked delivery status card",
    sourceHas(workspace, /kxd-os-share-locked/) &&
      sourceHas(workspace, /This live proposal is protected\. Its secure client link remains active/),
  );
  check(
    "Protected proposals hide Approve / Prepare / Replace / Mark as Sent controls",
    sourceHas(workspace, /shareState\?\.liveDealProtected \? \(/) &&
      /liveDealProtected \? \([\s\S]*?kxd-os-share-locked[\s\S]*?Download PDF[\s\S]*?\) : \(/.test(
        readRepo(workspace),
      ),
  );
  check(
    "Protected proposals do not show the unrecoverable-URL warning",
    !/liveDealProtected[\s\S]{0,400}cannot be recovered/.test(readRepo(workspace)) &&
      sourceHas(workspace, /A secure share link is already active\. The original URL cannot be/),
  );
  check(
    "Booking link lives in proposal settings, not the share-action row",
    sourceHas(workspace, /Optional consultation booking link/) &&
      sourceHas(
        workspace,
        /Add a Calendly, Google Calendar, or other booking link[\s\S]{0,80}proposal-review call/,
      ),
  );
  check(
    "Mark as Sent advances approved-for-sharing → sent only",
    nextStatusOnMarkSent("approved-for-sharing") === "sent" &&
      nextStatusOnMarkSent("sent") === "sent" &&
      nextStatusOnMarkSent("viewed") === "viewed",
  );

  const delivery = normalizeManualDelivery({
    method: "copied-link",
    deliveredAt: "2026-08-19T12:00:00.000Z",
    recipient: "ada@example.com",
    note: "Texted the URL",
    proposalId: 42,
    now: "2026-08-19T12:05:00.000Z",
  });
  check("Manual delivery records method and recipient", delivery.method === "copied-link");
  check("Manual delivery uses operator timestamp", delivery.deliveredAt === "2026-08-19T12:00:00.000Z");
  check(
    "Manual delivery dedupe key is proposal-scoped",
    delivery.activityDedupeKey === "proposal-manual-delivery:42",
  );

  const shareState = buildOperatorShareState({
    status: "approved-for-sharing",
    shareSnapshot: { title: "Test" },
    shareLinks: [],
    publicTokenHash: record.tokenHash,
    liveDealProtected: false,
  });
  check("Operator share state never claims the raw token is recoverable", shareState.rawTokenRecoverable === false);
  check("Hash-only V1 links surface as an active share link", shareState.hasActiveShareLink === true);

  // Live-deal protection
  check(
    "Live deal: de Bois Entertainment",
    matchesProtectedLiveDealIdentity(["Website Rebuild — de Bois Entertainment"]),
  );
  check(
    "Live deal: Platinum Film Workz by HJ",
    matchesProtectedLiveDealIdentity(["Platinum Film Workz by HJ"]),
  );
  check(
    "Live deal: Mattas Motorsports",
    isProtectedLiveCommercialProposal({
      id: 999,
      title: "Website Rebuild",
      builderDocument: { organizations: [{ name: "Mattas Motorsports" }] },
    }),
  );
  check(
    "Unrelated proposal is not protected by name",
    isProtectedLiveCommercialProposal({
      id: 12,
      title: "Local QA draft",
      builderDocument: { organizations: [{ name: "Example Studio" }] },
    }) === false,
  );
  check(
    "Operator mutations call live-deal protection",
    sourceHas(shareServices, /assertMutableLiveDeal\(existing, "approve for sharing"\)/) &&
      sourceHas(shareServices, /assertMutableLiveDeal\(existing, "prepare share link"\)/) &&
      sourceHas(shareServices, /assertMutableLiveDeal\(existing, "replace share link"\)/) &&
      sourceHas(shareServices, /assertMutableLiveDeal\(existing, "mark as sent"\)/),
  );

  check(
    "Old markShared body is ignored",
    sourceHas(shareRoute, /action === "mark-sent"/) && sourceLacks(shareRoute, /markShared/),
  );

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
