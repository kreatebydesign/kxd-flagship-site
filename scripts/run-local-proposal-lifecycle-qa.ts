/**
 * Isolated local QA fixture for the full proposal lifecycle.
 * NEVER touches Proposal ID 1.
 *
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --env-file=.env.local \
 *     --import ./scripts/shims/register-server-only.mjs \
 *     scripts/run-local-proposal-lifecycle-qa.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { dollarsToCents } from "../lib/proposal-builder/money.ts";
import { emptyProposalDocument, newId } from "../lib/proposal-builder/document.ts";
import { createProposal, acceptProposal } from "../lib/proposal-builder/services.ts";
import {
  ensureLifecycleHydrated,
  sendContractForClientSignature,
  signContractAsClient,
  signContractAsOperator,
  simulateLocalProposalSend,
  summarizeProgression,
} from "../lib/proposal-lifecycle/services.ts";

function assertLocal(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (/neon\.tech|vercel-storage|amazonaws\.com/i.test(uri)) {
    throw new Error("Refusing cloud database");
  }
  const host = new URL(uri).hostname;
  const db = new URL(uri).pathname.replace(/^\//, "").split("?")[0];
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(host);
  if (db !== "kxd_audit_report_review") throw new Error(db);
}

async function main() {
  assertLocal();
  const outDir = join(process.cwd(), "tmp", "proposal-lifecycle-qa");
  mkdirSync(outDir, { recursive: true });

  const doc = emptyProposalDocument({
    organizations: [
      { id: newId("org"), name: "Lifecycle QA Org" },
      { id: newId("org"), name: "Lifecycle QA Brand" },
    ],
    contacts: [
      {
        id: newId("contact"),
        name: "Taylor QA",
        email: "taylor.qa@localhost.invalid",
        title: "Operations Lead",
        phone: "(555) 010-2026",
        isPrimary: true,
      },
    ],
    executive: {
      clientFacingIntro: "Local lifecycle QA fixture introduction.",
      executiveSummary: "Isolated fixture for acceptance → contract → billing rehearsal.",
      objectives: "Validate controlled lifecycle without touching Proposal ID 1.",
      recommendedDirection: "Use mocked Stripe and simulated delivery only.",
    },
    scopeGroups: [
      {
        id: newId("scope"),
        title: "QA Website Scope",
        organizationName: "Lifecycle QA Org",
        overview: "Fixture scope overview.",
        deliverables: [
          { id: newId("d"), title: "Design", sortOrder: 1 },
          { id: newId("d"), title: "Build", sortOrder: 2 },
        ],
        estimatedTimeline: "Approximately 4 weeks (fixture)",
        exclusions: "Production work excluded.",
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
      proposalTerms: "Fixture terms.",
      paymentAssumptions: "Fixture payment assumptions.",
      nextSteps: "Accept to generate contract draft.",
      closingNote: "Local QA only.",
    },
  });

  const created = await createProposal({
    title: "LOCAL QA — Proposal Lifecycle Fixture",
    document: doc,
  });
  const proposalId = Number(created.id);
  if (proposalId === 1) {
    throw new Error("Fixture unexpectedly received Proposal ID 1 — aborting.");
  }

  const send = await simulateLocalProposalSend({
    proposalId,
    recipientName: "Taylor QA",
    recipientEmail: "taylor.qa@localhost.invalid",
    createdBy: "lifecycle-qa",
  });

  const token = send.publicUrl.split("/proposal/")[1];
  if (!token) throw new Error("Missing public token from simulated send");

  const accepted = await acceptProposal(token, {
    name: "Taylor QA",
    title: "Operations Lead",
    organization: "Lifecycle QA Org",
    email: "taylor.qa@localhost.invalid",
    authorityConfirmed: true,
    reviewedConfirmed: true,
    typedAcknowledgment: "Taylor QA",
    correlationId: "lifecycle-qa-accept-1",
    ipAddress: "127.0.0.1",
    userAgent: "lifecycle-qa-script",
  });

  const contractId = accepted.contractId;
  if (!contractId) throw new Error("No contract created from acceptance");

  await ensureLifecycleHydrated(contractId);

  const {
    applyLocalReviewedKxdInvoiceConfig,
    reviewed,
  } = await import("../lib/proposal-lifecycle/billing-identity.ts");
  applyLocalReviewedKxdInvoiceConfig({
    legalEntity: reviewed("Kreate by Design LLC (local fixture)", "lifecycle-qa"),
    mailingAddress: reviewed("Local fixture mailing address", "lifecycle-qa"),
    billingEmail: reviewed("billing@localhost.invalid", "lifecycle-qa"),
    remittanceInformation: reviewed("Local fixture remittance", "lifecycle-qa"),
    invoiceNumberingConfigured: true,
    invoiceNumberingState: "reviewed",
  });

  const { resolveClientBillingIdentity, processLifecycleMockPaymentWebhook, prepareMockStripeDraftsForContract } =
    await import("../lib/proposal-lifecycle/services.ts");
  await resolveClientBillingIdentity(contractId, {
    legalName: "Lifecycle QA Org",
    billingEmail: "taylor.qa@localhost.invalid",
    billingAddress: "100 Fixture Street, Local QA, OR 97479",
    taxTreatment: "exclusive",
    actor: "lifecycle-qa",
  });

  const op = await signContractAsOperator(contractId, {
    legalName: "Matt KXD",
    title: "Principal",
    entityName: "Kreate by Design",
    email: "matt@localhost.invalid",
    typedAcknowledgment: "Matt KXD",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actor: "lifecycle-qa",
    ipAddress: "127.0.0.1",
    userAgent: "lifecycle-qa-script",
  });

  const sent = await sendContractForClientSignature({
    contractId,
    recipientName: "Taylor QA",
    recipientEmail: "taylor.qa@localhost.invalid",
    createdBy: "lifecycle-qa",
    forceDespiteBillingBlockers: false,
  });

  // Persist signing URL for browser QA before token is revoked by client signature.
  writeFileSync(
    join(outDir, "valid-client-signing-url.txt"),
    `${sent.preview.secureUrl}\n`,
  );

  const clientSigned = await signContractAsClient(sent.rawToken, {
    name: "Taylor QA",
    title: "Operations Lead",
    organization: "Lifecycle QA Org",
    email: "taylor.qa@localhost.invalid",
    authorityConfirmed: true,
    reviewedConfirmed: true,
    typedAcknowledgment: "Taylor QA",
    electronicRecordsConsent: true,
    ipAddress: "127.0.0.1",
    userAgent: "lifecycle-qa-script",
    correlationId: "lifecycle-qa-1",
  });

  const initial = clientSigned.pkg.billingPlan?.obligations.find((o) => o.kind === "initial");
  await prepareMockStripeDraftsForContract(contractId);
  const afterPay = await processLifecycleMockPaymentWebhook(contractId, {
    id: "evt_mock_lifecycle_qa_payment",
    type: "invoice.paid",
    livemode: false,
    obligationId: initial?.id,
    amountCents: initial?.amountCents,
    currency: initial?.currency,
  });

  // Replay should be safe
  await processLifecycleMockPaymentWebhook(contractId, {
    id: "evt_mock_lifecycle_qa_payment",
    type: "invoice.paid",
    livemode: false,
    obligationId: initial?.id,
    amountCents: initial?.amountCents,
    currency: initial?.currency,
  });

  const summary = {
    safety: {
      proposalId1Untouched: true,
      fixtureProposalId: proposalId,
      fixtureContractId: contractId,
      database: "kxd_audit_report_review",
      realEmail: false,
      liveStripe: false,
    },
    urls: {
      fixtureProposalEdit: `http://localhost:3000/admin/sales/proposals/${proposalId}`,
      fixtureProposalPreview: `http://localhost:3000/admin/sales/proposals/${proposalId}/preview`,
      publicProposal: send.publicUrl,
      contractWorkspace: `http://localhost:3000/admin/sales/contracts/${contractId}`,
      // signing URL written to valid-client-signing-url.txt before revoke
    },
    progression: summarizeProgression({
      proposalStatus: "accepted-contract-pending",
      contractStatus: String(clientSigned.contract.status),
      pkg: afterPay,
    }),
    deliveryPreviews: [
      { kind: send.preview.kind, label: send.preview.label, to: send.preview.recipientEmail },
      { kind: sent.preview.kind, label: sent.preview.label, to: sent.preview.recipientEmail },
    ],
    certificate: clientSigned.pkg.executedCertificate,
    documentRefs: afterPay.documentRefs ?? clientSigned.pkg.documentRefs,
    billingPlan: {
      id: afterPay.billingPlan?.id,
      status: afterPay.billingPlan?.status,
      invoiceReadiness: afterPay.billingPlan?.invoiceReadiness,
      mockStripe: afterPay.billingPlan?.mockStripe,
      obligations: afterPay.billingPlan?.obligations.map((o) => ({
        id: o.id,
        kind: o.kind,
        label: o.label,
        amountCents: o.amountCents,
        status: o.status,
        stripeDraftInvoiceId: o.stripeDraftInvoiceId,
      })),
      recurring: afterPay.billingPlan?.recurring,
      issues: afterPay.billingPlan?.issues?.map((i) => i.code),
    },
    onboardingEligible: afterPay.onboardingEligible,
    operatorSignedAt: op.pkg.operatorSignature?.signedAt,
    clientSignedAt: clientSigned.pkg.clientSignature?.signedAt,
  };

  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  writeFileSync(
    join(outDir, "proposal-delivery.txt"),
    `${send.preview.label}\n\n${send.preview.subject}\n\n${send.preview.bodyText}\n`,
  );
  writeFileSync(
    join(outDir, "contract-delivery.txt"),
    `${sent.preview.label}\n\n${sent.preview.subject}\n\n${sent.preview.bodyText}\n`,
  );

  writeFileSync(
    join(outDir, "certificate.json"),
    JSON.stringify(clientSigned.pkg.executedCertificate, null, 2),
  );

  console.log(JSON.stringify(summary, null, 2));
  // Payload keeps the process alive; exit explicitly after fixture work.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
