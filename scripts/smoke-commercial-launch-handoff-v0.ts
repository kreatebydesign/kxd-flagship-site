/**
 * Controlled LOCAL smoke for Commercial → Client Launch Handoff V0.
 *
 * Safety:
 * - Refuses cloud databases
 * - Uses synthetic @localhost.invalid recipients only
 * - Mock Stripe payment only (no live Stripe)
 * - Does not require Resend (expects delivery failure + activateUrlForDev)
 *
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --env-file=.env.local.bak.live \
 *     --import ./scripts/shims/register-server-only.mjs \
 *     scripts/smoke-commercial-launch-handoff-v0.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPayload } from "payload";
import config from "@payload-config";
import { dollarsToCents } from "../lib/proposal-builder/money";
import { emptyProposalDocument, newId } from "../lib/proposal-builder/document";
import { createProposal, acceptProposal } from "../lib/proposal-builder/services";
import {
  ensureLifecycleHydrated,
  sendContractForClientSignature,
  signContractAsClient,
  signContractAsOperator,
  simulateLocalProposalSend,
  processLifecycleMockPaymentWebhook,
  prepareMockStripeDraftsForContract,
  resolveClientBillingIdentity,
  getContractLifecycle,
} from "../lib/proposal-lifecycle/services";
import {
  applyLocalReviewedKxdInvoiceConfig,
  reviewed,
} from "../lib/proposal-lifecycle/billing-identity";
import {
  startCommercialLaunchHandoff,
  markCommercialLaunchCompleted,
} from "../lib/commercial-launch-handoff/start";
import { isModernCommercialProposal } from "../lib/commercial-launch-handoff/legacy-guard";
import { HANDOFF_READY_CES_MODULES } from "../lib/commercial-launch-handoff/ready-modules";
import { launchFromDraft, getLaunchDraft } from "../lib/client-launch-wizard/server";
import {
  acceptPortalInvitation,
  findInvitationByRawToken,
} from "../lib/portal/identity/invitations";
import { listPortalMembershipsForUser } from "../lib/portal/memberships";
import { userRequiresSecurityEnrollment } from "../lib/portal/identity/mfa-store";
import { PORTAL_CLIENT_LANGUAGE } from "../lib/ces/copy/portal-language";
// welcomeChecked via portal-user.welcomeCompletedAt directly (needsPortalWelcome expects session)

type Check = { id: string; ok: boolean; detail: string };

function assertLocal(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!uri) throw new Error("Missing DATABASE_URI");
  if (/neon\.tech|vercel-storage|amazonaws\.com/i.test(uri)) {
    throw new Error("Refusing cloud database for smoke");
  }
  const u = new URL(uri);
  if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") {
    throw new Error(`Refusing non-local host: ${u.hostname}`);
  }
  const db = u.pathname.replace(/^\//, "").split("?")[0];
  if (db !== "kxd_audit_report_review") {
    throw new Error(`Refusing unexpected local database: ${db}`);
  }
}

function check(id: string, ok: boolean, detail: string): Check {
  const row = { id, ok, detail };
  console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${detail}`);
  return row;
}

async function main() {
  assertLocal();
  if (!process.env.NODE_ENV) {
    Object.assign(process.env, { NODE_ENV: "development" });
  }

  const stamp = Date.now();
  const company = `Handoff Smoke Co ${stamp}`;
  const email = `handoff.smoke.${stamp}@localhost.invalid`;
  const contact = `Smoke Contact ${stamp}`;
  const outDir = join(process.cwd(), "tmp", "commercial-launch-handoff-smoke");
  mkdirSync(outDir, { recursive: true });

  const checks: Check[] = [];
  const payload = await getPayload({ config });

  // --- Build modern commercial deal to onboardingEligible ---
  const doc = emptyProposalDocument({
    organizations: [{ id: newId("org"), name: company }],
    contacts: [
      {
        id: newId("contact"),
        name: contact,
        email,
        title: "Owner",
        phone: "(555) 014-2026",
        isPrimary: true,
      },
    ],
    executive: {
      clientFacingIntro: "Synthetic handoff smoke engagement.",
      executiveSummary: "Local smoke for commercial → launch handoff V0.",
      objectives: "Validate Start Client Launch through invite activation.",
      recommendedDirection: "Use mock payment and localhost.invalid only.",
    },
    scopeGroups: [
      {
        id: newId("scope"),
        title: "Website",
        organizationName: company,
        overview: "Synthetic website engagement.",
        deliverables: [{ id: newId("d"), title: "Website rebuild", sortOrder: 1 }],
        estimatedTimeline: "4 weeks",
        exclusions: "Production clients excluded.",
        inclusion: "included",
        sortOrder: 1,
      },
    ],
    pricingLines: [
      {
        id: newId("line"),
        title: "Fixture website build",
        cadence: "one-time",
        inclusion: "included",
        quantity: 1,
        unitPriceCents: dollarsToCents(2000),
        isAddon: false,
        sortOrder: 1,
      },
      {
        id: newId("line"),
        title: "Fixture monthly management",
        cadence: "monthly",
        inclusion: "included",
        quantity: 1,
        unitPriceCents: dollarsToCents(300),
        isAddon: false,
        sortOrder: 2,
      },
    ],
    credits: [],
    paymentSchedule: [
      {
        id: newId("pay"),
        label: "Project deposit",
        due: "at-acceptance",
        amountCents: dollarsToCents(1000),
        sortOrder: 1,
      },
      {
        id: newId("pay"),
        label: "Final payment",
        due: "remaining",
        amountCents: dollarsToCents(1000),
        sortOrder: 2,
      },
    ],
    depositCents: dollarsToCents(1000),
    terms: {
      proposalTerms: "Smoke terms.",
      paymentAssumptions: "Mock only.",
      nextSteps: "Accept → contract → mock pay → launch.",
      closingNote: "Local smoke only.",
    },
  });

  const created = await createProposal({
    title: `LOCAL SMOKE — Commercial Launch Handoff ${stamp}`,
    document: doc,
  });
  const proposalId = Number(created.id);
  if (proposalId === 1) throw new Error("Refusing Proposal ID 1");

  const proposalDoc = (await payload.findByID({
    collection: "proposals" as never,
    id: proposalId,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  checks.push(
    check(
      "legacy-guard-modern",
      isModernCommercialProposal(proposalDoc),
      "Fixture proposal classified as modern commercial",
    ),
  );

  const send = await simulateLocalProposalSend({
    proposalId,
    recipientName: contact,
    recipientEmail: email,
    createdBy: "handoff-smoke",
  });
  const token = send.publicUrl.split("/proposal/")[1];
  if (!token) throw new Error("Missing proposal token");

  const accepted = await acceptProposal(token, {
    name: contact,
    title: "Owner",
    organization: company,
    email,
    authorityConfirmed: true,
    reviewedConfirmed: true,
    typedAcknowledgment: contact,
    correlationId: `handoff-smoke-accept-${stamp}`,
    ipAddress: "127.0.0.1",
    userAgent: "handoff-smoke",
  });
  const contractId = accepted.contractId;
  if (!contractId) throw new Error("No contract from acceptance");

  await ensureLifecycleHydrated(contractId);
  applyLocalReviewedKxdInvoiceConfig({
    legalEntity: reviewed("Kreate by Design LLC (local fixture)", "handoff-smoke"),
    mailingAddress: reviewed("Local fixture mailing address", "handoff-smoke"),
    billingEmail: reviewed("billing@localhost.invalid", "handoff-smoke"),
    remittanceInformation: reviewed("Local fixture remittance", "handoff-smoke"),
    invoiceNumberingConfigured: true,
    invoiceNumberingState: "reviewed",
  });
  await resolveClientBillingIdentity(contractId, {
    legalName: company,
    billingEmail: email,
    billingAddress: "100 Smoke Street, Local QA, OR 97701",
    taxTreatment: "exclusive",
    actor: "handoff-smoke",
  });
  await signContractAsOperator(contractId, {
    legalName: "Matt KXD",
    title: "Principal",
    entityName: "Kreate by Design",
    email: "matt@localhost.invalid",
    typedAcknowledgment: "Matt KXD",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actor: "handoff-smoke",
    ipAddress: "127.0.0.1",
    userAgent: "handoff-smoke",
  });
  const sent = await sendContractForClientSignature({
    contractId,
    recipientName: contact,
    recipientEmail: email,
    createdBy: "handoff-smoke",
    forceDespiteBillingBlockers: false,
  });
  const clientSigned = await signContractAsClient(sent.rawToken, {
    name: contact,
    title: "Owner",
    organization: company,
    email,
    authorityConfirmed: true,
    reviewedConfirmed: true,
    typedAcknowledgment: contact,
    electronicRecordsConsent: true,
    ipAddress: "127.0.0.1",
    userAgent: "handoff-smoke",
    correlationId: `handoff-smoke-sign-${stamp}`,
  });
  const initial = clientSigned.pkg.billingPlan?.obligations.find((o) => o.kind === "initial");
  await prepareMockStripeDraftsForContract(contractId);
  const afterPay = await processLifecycleMockPaymentWebhook(contractId, {
    id: `evt_mock_handoff_smoke_${stamp}`,
    type: "invoice.paid",
    livemode: false,
    obligationId: initial?.id,
    amountCents: initial?.amountCents,
    currency: initial?.currency,
  });

  checks.push(
    check(
      "onboarding-eligible",
      Boolean(afterPay.onboardingEligible),
      `contract #${contractId} eligible=${Boolean(afterPay.onboardingEligible)}`,
    ),
  );

  // --- Start Client Launch (twice) ---
  const start1 = await startCommercialLaunchHandoff({
    payload,
    contractId,
    createdBy: "handoff-smoke",
  });
  checks.push(
    check(
      "start-launch-1",
      start1.ok === true && start1.ok && !start1.alreadyLaunched,
      start1.ok
        ? `draft=${start1.draftId} reused=${start1.reusedExistingDraft}`
        : start1.message,
    ),
  );
  if (!start1.ok) throw new Error(start1.message);

  const start2 = await startCommercialLaunchHandoff({
    payload,
    contractId,
    createdBy: "handoff-smoke",
  });
  checks.push(
    check(
      "start-launch-idempotent",
      start2.ok === true &&
        start2.ok &&
        start2.reusedExistingDraft === true &&
        String(start2.draftId) === String(start1.draftId),
      start2.ok
        ? `same draft ${start2.draftId} reused=${start2.reusedExistingDraft}`
        : start2.message,
    ),
  );

  const draft = await getLaunchDraft(payload, start1.draftId);
  if (!draft) throw new Error("Draft missing after start");
  const prefill = draft.payload;
  checks.push(
    check(
      "prefill-identity",
      prefill.identity.businessName.includes("Handoff Smoke Co") &&
        prefill.identity.primaryContactEmail === email.toLowerCase(),
      `name=${prefill.identity.businessName} email=${prefill.identity.primaryContactEmail}`,
    ),
  );
  checks.push(
    check(
      "prefill-modules",
      prefill.package.packageId === "starter" &&
        prefill.modules
          .filter((m) => m.selected)
          .every((m) => (HANDOFF_READY_CES_MODULES as readonly string[]).includes(m.moduleId)) &&
        prefill.modules.some((m) => m.moduleId === "website-review" && m.selected),
      `package=${prefill.package.packageId} selected=${prefill.modules
        .filter((m) => m.selected)
        .map((m) => m.moduleId)
        .join(",")}`,
    ),
  );
  checks.push(
    check(
      "prefill-commercial-link",
      prefill.commercialHandoff?.contractId === contractId &&
        prefill.commercialHandoff.reuseExistingClient === true &&
        typeof prefill.commercialHandoff.sourceClientId === "number",
      `handoff.contractId=${prefill.commercialHandoff?.contractId} sourceClientId=${prefill.commercialHandoff?.sourceClientId} reuse=${prefill.commercialHandoff?.reuseExistingClient}`,
    ),
  );

  // --- Operator launch ---
  const launched = await launchFromDraft({
    payload,
    draftId: start1.draftId,
    createdBy: "handoff-smoke",
    requestOrigin: "http://localhost:3000",
  });
  checks.push(
    check(
      "operator-launch",
      launched.ok === true,
      launched.ok
        ? `clientId=${launched.result.clientId}`
        : `${launched.status} ${launched.message}`,
    ),
  );
  if (!launched.ok) throw new Error(launched.message);

  const clientId = launched.result.clientId;
  const relaunch = await launchFromDraft({
    payload,
    draftId: start1.draftId,
    createdBy: "handoff-smoke",
    requestOrigin: "http://localhost:3000",
  });
  checks.push(
    check(
      "relaunch-blocked",
      relaunch.ok === false && relaunch.status === 409,
      relaunch.ok ? "unexpected success" : relaunch.message,
    ),
  );

  const start3 = await startCommercialLaunchHandoff({
    payload,
    contractId,
    createdBy: "handoff-smoke",
  });
  checks.push(
    check(
      "already-launched-recognized",
      start3.ok === true && start3.ok && start3.alreadyLaunched === true,
      start3.ok
        ? `launchedClientId=${start3.launchedClientId}`
        : start3.message,
    ),
  );

  // CES modules
  const ces = await payload.find({
    collection: "client-experience-profiles" as never,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const cesDoc = ces.docs[0] as { enabledModules?: string[] } | undefined;
  const enabled = Array.isArray(cesDoc?.enabledModules) ? cesDoc!.enabledModules! : [];
  checks.push(
    check(
      "entitlements-ready-only",
      enabled.includes("website-review") &&
        !enabled.includes("inventory") &&
        !enabled.includes("website-workspace"),
      `enabled=${enabled.join(",") || "(none)"}`,
    ),
  );

  // Invitation outcomes
  const inviteRows = launched.result.portalUsersCreated;
  const invite = inviteRows[0];
  checks.push(
    check(
      "invitation-created",
      Boolean(invite?.invitationId) && invite?.inviteQueued !== true,
      invite
        ? `id=${invite.invitationId} status=${invite.invitationStatus} emailSent=${invite.emailSent}`
        : "missing invite row",
    ),
  );
  checks.push(
    check(
      "invitation-truthful-delivery",
      invite?.emailSent === false &&
        invite?.invitationStatus === "invitation-delivery-failed",
      "No Resend in local bak env — expect delivery failed, not success",
    ),
  );

  // Recover activate URL by resending invitation (dev URL when email fails)
  const { sendPortalInvitation } = await import("../lib/portal/identity/invitations");
  if (!invite?.invitationId) throw new Error("No invitation id");
  const resent = await sendPortalInvitation({
    invitationId: invite.invitationId,
    origin: "http://localhost:3000",
    operatorUserId: null,
    resend: true,
  });
  checks.push(
    check(
      "invitation-resend-recoverable",
      resent.emailSent === false && Boolean(resent.activateUrlForDev),
      `emailSent=${resent.emailSent} hasDevUrl=${Boolean(resent.activateUrlForDev)}`,
    ),
  );

  const activateUrl = resent.activateUrlForDev || "";
  const rawToken = new URL(activateUrl).searchParams.get("token") || "";
  checks.push(
    check("activation-token-present", rawToken.length > 16, `tokenLen=${rawToken.length}`),
  );

  const found = await findInvitationByRawToken(rawToken);
  checks.push(
    check(
      "activation-token-resolves",
      Boolean(found) &&
        found!.memberships.every((m) => m.clientId === clientId),
      found
        ? `memberships=${found.memberships.map((m) => m.clientId).join(",")}`
        : "token not found",
    ),
  );

  // Wrong-client isolation: invitation must not include other clients
  checks.push(
    check(
      "membership-isolation",
      Boolean(found) &&
        found!.memberships.length === 1 &&
        found!.memberships[0]!.clientId === clientId,
      "single intended client membership only",
    ),
  );

  const acceptedInvite = await acceptPortalInvitation({
    rawToken,
    password: "SmokeTest-Pass-2026!",
    displayName: contact,
    termsAccepted: true,
  });
  checks.push(
    check(
      "activation-accept",
      acceptedInvite.ok === true,
      acceptedInvite.ok
        ? `portalUserId=${acceptedInvite.portalUserId}`
        : acceptedInvite.publicMessage,
    ),
  );
  if (!acceptedInvite.ok) throw new Error(acceptedInvite.publicMessage);

  const memberships = await listPortalMembershipsForUser(acceptedInvite.portalUserId, {
    payload,
  });
  const activeForClient = memberships.filter(
    (m) => m.clientId === clientId && m.status === "active",
  );
  checks.push(
    check(
      "membership-active",
      activeForClient.length === 1,
      `activeCount=${activeForClient.length} total=${memberships.length}`,
    ),
  );

  // Second accept should fail (token consumed)
  const reuse = await acceptPortalInvitation({
    rawToken,
    password: "SmokeTest-Pass-2026!",
    displayName: contact,
    termsAccepted: true,
  });
  checks.push(
    check(
      "token-one-time",
      reuse.ok === false,
      reuse.ok ? "token unexpectedly reusable" : reuse.publicMessage,
    ),
  );

  // Duplicate invite prevention / access-active
  const startInviteAgain = await launchFromDraft({
    payload,
    draftId: start1.draftId,
    createdBy: "handoff-smoke",
  });
  checks.push(
    check(
      "duplicate-launch-after-active",
      startInviteAgain.ok === false,
      startInviteAgain.ok ? "unexpected relaunch" : startInviteAgain.message,
    ),
  );

  const requiresMfa = await userRequiresSecurityEnrollment(acceptedInvite.portalUserId);
  checks.push(
    check(
      "mfa-required",
      requiresMfa === true,
      `userRequiresSecurityEnrollment=${requiresMfa}`,
    ),
  );

  // Welcome gate: needsPortalWelcome for fresh user (no welcomeCompletedAt)
  const portalUser = (await payload.findByID({
    collection: "portal-users" as never,
    id: acceptedInvite.portalUserId,
    depth: 0,
    overrideAccess: true,
  })) as { welcomeCompletedAt?: string | null };
  const needsWelcome = !portalUser.welcomeCompletedAt;
  checks.push(
    check(
      "welcome-required",
      needsWelcome === true,
      `welcomeCompletedAt=${portalUser.welcomeCompletedAt ?? "null"}`,
    ),
  );
  checks.push(
    check(
      "mfa-flag-from-accept",
      acceptedInvite.requiresSecurityEnrollment === true,
      `requiresSecurityEnrollment=${acceptedInvite.requiresSecurityEnrollment}`,
    ),
  );
  checks.push(
    check(
      "welcome-next-steps-copy",
      Boolean(PORTAL_CLIENT_LANGUAGE.engagementActiveTitle) &&
        PORTAL_CLIENT_LANGUAGE.needsFromYouItems.length >= 3 &&
        PORTAL_CLIENT_LANGUAGE.kxdDoingItems.length >= 3,
      "engagement next-steps copy present",
    ),
  );

  // Contract association
  const { contract, pkg } = await getContractLifecycle(contractId);
  const linkedClient =
    typeof contract.client === "object" && contract.client && "id" in contract.client
      ? Number((contract.client as { id: number }).id)
      : Number(contract.client);
  checks.push(
    check(
      "commercial-client-association",
      linkedClient === clientId && pkg.launchHandoff?.launchedClientId === clientId,
      `contract.client=${linkedClient} handoff.launched=${pkg.launchHandoff?.launchedClientId}`,
    ),
  );

  // Existing open invitation / access-active path via invite helper
  const { inviteTeamViaPortalAccess } = await import(
    "../lib/commercial-launch-handoff/invite"
  );
  const reinvite = await inviteTeamViaPortalAccess({
    payload,
    clientId,
    clientName: company,
    team: [
      {
        id: "1",
        name: contact,
        email,
        role: "owner",
        isPrimaryContact: true,
        inviteOnLaunch: true,
      },
    ],
    origin: "http://localhost:3000",
  });
  checks.push(
    check(
      "existing-membership-no-dup-invite",
      reinvite[0]?.status === "access-active",
      `status=${reinvite[0]?.status} msg=${reinvite[0]?.message}`,
    ),
  );

  // markCommercialLaunchCompleted already ran during launch; ensure function remains idempotent-ish
  await markCommercialLaunchCompleted({
    payload,
    contractId,
    clientId,
    draftId: start1.draftId,
    invitationIds: invite.invitationId ? [invite.invitationId] : [],
    invitationOutcomes: reinvite,
  });

  const failed = checks.filter((c) => !c.ok);
  const summary = {
    safety: {
      database: "kxd_audit_report_review@127.0.0.1",
      productionWrites: false,
      liveStripe: false,
      realClientEmail: false,
      emailsAttempted: true,
      emailDestination: email,
      emailActuallyDelivered: false,
      envFile: ".env.local.bak.live",
    },
    scenario: {
      company,
      email,
      proposalId,
      contractId,
      clientId,
      draftId: start1.draftId,
      invitationId: invite?.invitationId ?? null,
    },
    checks,
    failed: failed.map((f) => f.id),
    passCount: checks.filter((c) => c.ok).length,
    failCount: failed.length,
  };

  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("\n=== SMOKE SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
