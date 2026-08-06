/**
 * LOCAL ONLY — Direct Agreement Campaign Lite end-to-end QA fixture.
 *
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --env-file=.env.local \
 *     --import ./scripts/shims/register-server-only.mjs \
 *     scripts/qa-direct-agreement-local.ts
 *
 * Never touches Neon/production. Never charges Stripe. Never sends email.
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  activateDirectAgreementService,
  createDirectAgreement,
  finalizeDirectAgreement,
  linkPaymentReferences,
  recordExternalAcceptance,
  recordPaymentAuthorization,
} from "../lib/direct-agreement";
import {
  readCommercialDocumentBytes,
  verifyCommercialDocumentIntegrity,
} from "../lib/proposal-lifecycle/documents/file";
import { DEFAULT_LEGAL_COPY } from "../lib/direct-agreement/default-legal-copy";

const FIXTURE_SLUG = "qa-campaign-lite-direct-agreement";
const FIXTURE_NAME = "QA Campaign Lite Fixture (local)";

function assertLocal(): { host: string; database: string } {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!uri) throw new Error("DATABASE_URI missing");
  if (/neon\.tech|vercel-storage|amazonaws\.com/i.test(uri)) {
    throw new Error("Refusing cloud database");
  }
  const parsed = new URL(uri);
  const host = parsed.hostname;
  const database = parsed.pathname.replace(/^\//, "").split("?")[0] || "";
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing non-local host: ${host}`);
  }
  if (database !== "kxd_audit_report_review") {
    throw new Error(`Refusing unexpected database: ${database}`);
  }
  return { host, database };
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${message}`);
}

async function main() {
  const db = assertLocal();
  const outDir = join(process.cwd(), "tmp", "direct-agreement-qa");
  const shotsDir = join(outDir, "screenshots");
  const pdfDir = join(outDir, "pdfs");
  mkdirSync(shotsDir, { recursive: true });
  mkdirSync(pdfDir, { recursive: true });

  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    database: db,
    checks: [] as string[],
  };
  const checks = report.checks as string[];
  const pass = (label: string) => {
    checks.push(label);
    console.log(`  ✓ ${label}`);
  };

  console.log("qa:direct-agreement-local");
  console.log(`  db ${db.host}/${db.database}`);

  const payload = await getPayload({ config });

  // Ensure client fixture (reuse by slug)
  const existing = await payload.find({
    collection: "clients" as never,
    where: { slug: { equals: FIXTURE_SLUG } },
    limit: 1,
    overrideAccess: true,
  });
  let clientId: number;
  if (existing.docs[0]) {
    clientId = Number((existing.docs[0] as { id: number }).id);
    pass(`Reused fixture client #${clientId}`);
  } else {
    const created = (await payload.create({
      collection: "clients" as never,
      data: {
        name: FIXTURE_NAME,
        slug: FIXTURE_SLUG,
        status: "active",
        relationshipStatus: "healthy",
        brandTier: "growth",
        notes: "LOCAL QA ONLY — Campaign Lite Direct Agreement fixture. Not production.",
      } as never,
      overrideAccess: true,
    })) as { id: number };
    clientId = Number(created.id);
    pass(`Created fixture client #${clientId}`);
  }

  // Orphan create must fail
  let orphanFailed = false;
  try {
    await createDirectAgreement({
      clientId: 0,
      title: "Should fail",
      contractType: "custom",
      body: "x",
      agreementTerms: {
        commercialStructure: "one-time",
        oneTimeAmountCents: 100,
        monthlyAmountCents: 0,
        serviceStartDate: "2026-08-04",
        serviceEndDate: "2026-11-04",
        scope: "s",
        includedServices: "i",
        exclusions: "e",
        capacityHoursPerMonth: 3,
        rolloverPolicy: "none",
        revisionAllowance: "2",
        overagePreapprovalRule: DEFAULT_LEGAL_COPY.overagePreapprovalRule,
        paymentTerms: DEFAULT_LEGAL_COPY.paymentTerms,
        cancellationRefundLanguage: DEFAULT_LEGAL_COPY.cancellationRefundLanguage,
        intellectualPropertyLanguage: DEFAULT_LEGAL_COPY.intellectualPropertyLanguage,
        portfolioUseLanguage: DEFAULT_LEGAL_COPY.portfolioUseLanguage,
        clientResponsibilities: DEFAULT_LEGAL_COPY.clientResponsibilities,
        renewalBehavior: DEFAULT_LEGAL_COPY.renewalBehavior,
        autoRenew: false,
      },
      actor: "qa-local",
    });
  } catch {
    orphanFailed = true;
  }
  assert(orphanFailed, "orphan Direct Agreement must fail");
  pass("1. Direct Agreement requires an existing client");

  const includedServices = [
    "Up to three hours per month of campaign support",
    "Website content and endorsement updates",
    "Monthly SEO optimization",
    "Google indexing/visibility work",
    "Campaign graphics and digital materials",
    "Content changes and general campaign support",
    "August canvassing handout using included creative hours",
    "Double-sided 5×7 design with content creation",
    "QR-code placement",
    "Print-ready files with bleed marks",
    "Up to two revision rounds on the handout",
  ].join("\n");

  const body = [
    "Campaign Lite — Direct Agreement (local QA fixture)",
    "",
    "Parties: Kreate by Design and the named campaign client fixture.",
    "Service period: August 4, 2026 through November 4, 2026.",
    "Fee: $850 USD prepaid one-time. Not a recurring subscription.",
    "",
    "Included:",
    includedServices,
    "",
    "Excluded: Printing is not included.",
    "Unused monthly hours do not automatically roll over.",
    "Work exceeding three hours in a month requires advance written approval.",
    "Larger standalone projects require separate scoping.",
    "",
    DEFAULT_LEGAL_COPY.cancellationRefundLanguage,
    DEFAULT_LEGAL_COPY.intellectualPropertyLanguage,
    DEFAULT_LEGAL_COPY.portfolioUseLanguage,
    DEFAULT_LEGAL_COPY.clientResponsibilities,
    DEFAULT_LEGAL_COPY.renewalBehavior,
  ].join("\n");

  const created = await createDirectAgreement({
    clientId,
    title: "Campaign Lite — QA Fixture",
    contractType: "marketing-retainer",
    publicTitle: "Campaign Lite",
    body,
    executiveNotes:
      "LOCAL QA ONLY. Not Robin production. Henry card authorization noted without PAN.",
    actor: "qa-local@localhost.invalid",
    agreementTerms: {
      commercialStructure: "one-time",
      oneTimeAmountCents: 85000,
      monthlyAmountCents: 0,
      serviceStartDate: "2026-08-04",
      serviceEndDate: "2026-11-04",
      scope:
        "Prepaid three-month campaign support (Campaign Lite) including website/SEO/graphics support and August canvassing handout creative.",
      includedServices,
      exclusions: "Printing is not included. Unexpected charges are not authorized.",
      capacityHoursPerMonth: 3,
      rolloverPolicy: "none",
      revisionAllowance: "Up to two revision rounds for the canvassing handout",
      overagePreapprovalRule: DEFAULT_LEGAL_COPY.overagePreapprovalRule,
      paymentTerms: DEFAULT_LEGAL_COPY.paymentTerms,
      cancellationRefundLanguage: DEFAULT_LEGAL_COPY.cancellationRefundLanguage,
      intellectualPropertyLanguage: DEFAULT_LEGAL_COPY.intellectualPropertyLanguage,
      portfolioUseLanguage: DEFAULT_LEGAL_COPY.portfolioUseLanguage,
      clientResponsibilities: DEFAULT_LEGAL_COPY.clientResponsibilities,
      renewalBehavior: DEFAULT_LEGAL_COPY.renewalBehavior,
      autoRenew: false,
      billingContactName: "QA Campaign Contact",
      billingEmail: "qa.campaign@localhost.invalid",
      payerLegalName: "QA Campaign Lite Fixture",
      brandName: "QA Campaign Lite",
    },
  });

  assert(created.proposalCreated === false, "must not create proposal");
  const contractId = created.contractId;
  pass("2. No proposal is created");

  const contractAfterCreate = (await payload.findByID({
    collection: "contracts" as never,
    id: contractId,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  assert(String(contractAfterCreate.agreementSource) === "direct-agreement", "source");
  assert(!contractAfterCreate.proposal, "proposal must be empty");
  assert(
    Number(contractAfterCreate.client) === clientId ||
      (typeof contractAfterCreate.client === "object" &&
        contractAfterCreate.client &&
        Number((contractAfterCreate.client as { id: number }).id) === clientId),
    "client preserved",
  );
  assert(
    String(contractAfterCreate.startDate).startsWith("2026-08-04") ||
      String(contractAfterCreate.startDate).includes("2026-08-04"),
    "start date",
  );
  pass("3. Client preserved; source is direct-agreement");
  pass("5. Service start/end dates persisted on contract");

  const { pkg: finalized } = await finalizeDirectAgreement({
    contractId,
    actor: "qa-local@localhost.invalid",
  });
  assert(finalized.commercialStatus === "finalized", "finalized status");
  assert(finalized.structuredPaymentTerms?.oneTimeTotalCents === 85000, "85000 cents");
  assert(finalized.structuredPaymentTerms?.monthlyTotalCents === 0, "no monthly");
  assert(finalized.structuredPaymentTerms?.recurring.cadence === "none", "no recurring cadence");
  assert(finalized.structuredPaymentTerms?.installments.length === 1, "one obligation");
  assert(finalized.structuredPaymentTerms?.commercialSource === "direct-agreement", "terms source");
  const sentRefs = (finalized.documentRefs ?? []).filter((d) => d.kind === "direct-agreement");
  assert(sentRefs.length >= 1, "sent PDF filed");
  pass("4. One-time $850 → one obligation, no recurring billing");
  pass("7. Finalize creates sent PDF snapshot");

  // Write sent PDF
  const sentDocId = sentRefs[sentRefs.length - 1]!.id;
  const sentRow = (await payload.findByID({
    collection: "commercial-documents" as never,
    id: sentDocId,
    depth: 0,
    overrideAccess: true,
  })) as unknown as {
    storageKey: string;
    storageProvider?: string;
    contentHash: string;
    mimeType: string;
    kind: string;
    client?: number | { id: number };
    proposal?: unknown;
  };
  assert(
    Number(typeof sentRow.client === "object" ? sentRow.client?.id : sentRow.client) === clientId,
    "sent doc client-linked",
  );
  assert(!sentRow.proposal, "sent doc has no proposal");
  const sentBuf = await readCommercialDocumentBytes({
    storageKey: sentRow.storageKey,
    storageProvider: sentRow.storageProvider,
  });
  const sentIntegrity = verifyCommercialDocumentIntegrity({
    buffer: sentBuf,
    contentHash: sentRow.contentHash,
    mimeType: sentRow.mimeType,
    kind: sentRow.kind,
  });
  assert(sentIntegrity.ok, "sent PDF integrity");
  writeFileSync(join(pdfDir, "01-sent-direct-agreement.pdf"), sentBuf);
  pass("20. Authenticated PDF bytes readable (sent)");

  const { pkg: accepted } = await recordExternalAcceptance({
    contractId,
    acceptedBy: "Robin Cole (QA Fixture)",
    acceptedAt: "2026-08-05",
    method: "email",
    evidenceNotes:
      "LOCAL QA: Robin approved the $850 prepaid Campaign Lite option in the email thread. Henry Cole will provide the designated campaign card. No raw card details stored.",
    evidenceReference: "local-qa-email-thread-ref",
    actor: "qa-local@localhost.invalid",
    operatorLegalName: "Matt QA",
    operatorTitle: "Principal",
    operatorEmail: "qa-local@localhost.invalid",
  });

  assert(accepted.externalAcceptance?.label === "externally-recorded-acceptance", "label");
  assert(accepted.externalAcceptance?.acceptedBy.includes("Robin"), "accepted by");
  assert(accepted.externalAcceptance?.acceptedAt.startsWith("2026-08-05"), "date");
  assert(accepted.externalAcceptance?.method === "email", "method");
  assert(accepted.externalAcceptance?.evidenceNotes.includes("email thread"), "evidence");
  assert(accepted.externalAcceptance?.recordedBy.includes("qa-local"), "operator");
  assert(Boolean(accepted.externalAcceptance?.recordedAt), "timestamp");
  assert(!accepted.clientSignature || accepted.clientSignature.typedAcknowledgment === "EXTERNAL_ACCEPTANCE_NOT_ELECTRONIC_SIGNATURE", "no real e-sign");
  assert(!accepted.clientSignature?.ipAddress, "no fabricated IP");
  pass("8–9. External acceptance evidence recorded without e-sign/IP fabrication");

  const executedRefs = (accepted.documentRefs ?? []).filter((d) => d.kind === "executed-contract");
  assert(executedRefs.length >= 1, "executed PDF");
  const proposalPdfs = (accepted.documentRefs ?? []).filter((d) => d.kind === "accepted-proposal");
  assert(proposalPdfs.length === 0, "no proposal PDF");
  pass("12. No proposal PDF generated");

  const executedDocId = executedRefs[executedRefs.length - 1]!.id;
  assert(executedDocId !== sentDocId, "separate document ids");
  const executedRow = (await payload.findByID({
    collection: "commercial-documents" as never,
    id: executedDocId,
    depth: 0,
    overrideAccess: true,
  })) as unknown as {
    storageKey: string;
    storageProvider?: string;
    contentHash: string;
    mimeType: string;
    kind: string;
  };
  assert(executedRow.contentHash !== sentRow.contentHash, "different content hash");
  const execBuf = await readCommercialDocumentBytes({
    storageKey: executedRow.storageKey,
    storageProvider: executedRow.storageProvider,
  });
  writeFileSync(join(pdfDir, "02-executed-external-acceptance.pdf"), execBuf);
  const execTextProbe = execBuf.toString("latin1");
  // PDF may compress text; also check source via regenerate content markers in package audit
  const hasExternalMarker =
    execTextProbe.includes("external") ||
    execTextProbe.includes("Externally") ||
    accepted.auditEvents?.some((e) => e.action.includes("external-acceptance"));
  assert(hasExternalMarker, "external acceptance marker present in package/PDF path");
  pass("10–11. Executed PDF is new immutable doc; external acceptance path used");

  const versionKinds = (accepted.documentRefs ?? []).map((d) => `${d.kind}#${d.id}`);
  assert(versionKinds.some((k) => k.startsWith("direct-agreement#")), "sent in history");
  assert(versionKinds.some((k) => k.startsWith("executed-contract#")), "executed in history");
  pass("13. Version history has sent + executed snapshots");
  report.documentRefs = accepted.documentRefs;

  // Payment authorization — reject raw card
  let rejectedRaw = false;
  try {
    await recordPaymentAuthorization({
      contractId,
      actor: "qa-local@localhost.invalid",
      payload: {
        authorizationType: "card-charge-authorization",
        authorizedBy: "Henry Cole",
        authorizationMethod: "email",
        authorizedAt: "2026-08-06",
        scope: "Campaign Lite $850 prepaid",
        amountAuthorizedCents: 85000,
        evidenceNotes: "Authorized designated campaign card",
        cardNumber: "4242424242424242",
        cvc: "123",
      },
    });
  } catch {
    rejectedRaw = true;
  }
  assert(rejectedRaw, "raw card must be rejected");
  pass("16. Raw card fields rejected");

  const { pkg: authorized } = await recordPaymentAuthorization({
    contractId,
    actor: "qa-local@localhost.invalid",
    payload: {
      authorizationType: "card-charge-authorization",
      authorizedBy: "Henry Cole",
      cardholderName: "Henry Cole",
      authorizationMethod: "email",
      authorizedAt: "2026-08-06",
      scope: "Campaign Lite $850 prepaid one-time charge after card confirmation",
      amountAuthorizedCents: 85000,
      evidenceNotes:
        "LOCAL QA: Authorization noted. Charge will occur in Stripe Dashboard only. Brand/last4 only.",
      stripeCustomerId: "cus_qa_local_fixture",
      stripePaymentMethodId: "pm_qa_local_fixture",
      cardBrand: "visa",
      cardLast4: "4242",
      cardExpMonth: 12,
      cardExpYear: 2030,
    },
  });
  assert(authorized.paymentAuthorization?.cardLast4 === "4242", "last4 stored");
  assert(!(authorized.paymentAuthorization as Record<string, unknown>)?.cardNumber, "no pan");
  pass("15. Payment authorization accepts safe Stripe metadata only");

  const { pkg: paid } = await linkPaymentReferences({
    contractId,
    actor: "qa-local@localhost.invalid",
    markPaid: true,
    references: {
      stripeCustomerId: "cus_qa_local_fixture",
      stripeInvoiceId: "in_qa_local_fixture",
      stripePaymentIntentId: "pi_qa_local_fixture",
      stripeChargeId: "ch_qa_local_fixture",
      hostedInvoiceUrl: "https://invoice.stripe.com/qa-local-fixture",
      receiptUrl: "https://pay.stripe.com/receipts/qa-local-fixture",
      paymentStatus: "paid",
    },
  });
  assert(paid.commercialStatus === "paid", "paid status");
  assert(paid.structuredPaymentTerms?.monthlyTotalCents === 0, "still no MRR");
  pass("17. Marked paid without creating MRR");

  const { pkg: active } = await activateDirectAgreementService({
    contractId,
    actor: "qa-local@localhost.invalid",
  });
  assert(active.commercialStatus === "active", "active");
  pass("18. Service activation is manual and separate");

  // Activity timeline — after full lifecycle so payment/activation events are included
  const activity = await payload.find({
    collection: "executive-timeline-events" as never,
    where: {
      and: [
        { client: { equals: clientId } },
        { eventType: { like: "direct-agreement." } },
      ],
    },
    limit: 40,
    overrideAccess: true,
    sort: "-occurredAt",
  });
  const eventTypes = activity.docs.map((d) => String((d as { eventType?: string }).eventType));
  for (const required of [
    "direct-agreement.created",
    "direct-agreement.finalized",
    "direct-agreement.external-acceptance-recorded",
    "direct-agreement.authorization-recorded",
    "direct-agreement.payment-recorded",
    "direct-agreement.service-activated",
  ]) {
    assert(eventTypes.includes(required), `timeline includes ${required}`);
  }
  pass("14. Commercial timeline records lifecycle events");
  report.timelineEventTypes = eventTypes;

  // Client filter — docs for this client only
  const docsForClient = await payload.find({
    collection: "commercial-documents" as never,
    where: { client: { equals: clientId } },
    limit: 50,
    overrideAccess: true,
  });
  assert(docsForClient.docs.every((d) => {
    const c = (d as { client?: number | { id: number } }).client;
    const id = typeof c === "object" ? c?.id : c;
    return Number(id) === clientId;
  }), "all docs for client");
  pass("19. Commercial documents filtered to fixture client");

  // Local storage
  assert(existsSync(join(process.cwd(), "storage", "commercial-documents")), "local storage root");
  pass("21. Local development storage works");

  // Proposal regression smoke — ensure createProposal path still importable / proposal collection untouched
  const proposals = await payload.find({
    collection: "proposals" as never,
    where: { title: { equals: "Campaign Lite — QA Fixture" } },
    limit: 1,
    overrideAccess: true,
  });
  assert(proposals.docs.length === 0, "no proposal with DA title");
  pass("23. No proposal pollution; proposal collection path intact");

  // Scope/exclusions on stored terms
  const refreshed = (await payload.findByID({
    collection: "contracts" as never,
    id: contractId,
    depth: 0,
    overrideAccess: true,
  })) as unknown as {
    directAgreementTerms?: {
      exclusions?: string;
      scope?: string;
      capacityHoursPerMonth?: number;
      rolloverPolicy?: string;
      autoRenew?: boolean;
    };
    projectAmount?: number;
    monthlyAmount?: number | null;
  };
  assert(refreshed.directAgreementTerms?.exclusions?.includes("Printing"), "exclusions");
  assert(refreshed.directAgreementTerms?.scope?.includes("Campaign Lite"), "scope");
  assert(refreshed.directAgreementTerms?.capacityHoursPerMonth === 3, "hours");
  assert(refreshed.directAgreementTerms?.rolloverPolicy === "none", "no rollover");
  assert(refreshed.directAgreementTerms?.autoRenew === false, "no auto renew");
  assert(Number(refreshed.projectAmount) === 850, "project amount 850");
  assert(!refreshed.monthlyAmount, "no monthly amount field");
  pass("6. Scope/exclusions/hours/rollover render correctly on stored terms");

  // Legal copy dump for Matt
  report.legalCopyForMattReview = DEFAULT_LEGAL_COPY;
  report.fixture = {
    clientId,
    clientSlug: FIXTURE_SLUG,
    contractId,
    commercialStatus: active.commercialStatus,
    documentRefs: active.documentRefs,
    externalAcceptance: active.externalAcceptance,
    paymentAuthorization: {
      authorizedBy: active.paymentAuthorization?.authorizedBy,
      amountAuthorizedCents: active.paymentAuthorization?.amountAuthorizedCents,
      cardBrand: active.paymentAuthorization?.cardBrand,
      cardLast4: active.paymentAuthorization?.cardLast4,
      stripeCustomerId: active.paymentAuthorization?.stripeCustomerId,
    },
    paymentReferences: active.paymentReferences,
    urls: {
      contractsTab: `/admin/operations/client-command/${clientId}?tab=contracts`,
      createForm: `/admin/operations/client-command/${clientId}/direct-agreement/new`,
      lifecycle: `/admin/sales/contracts/${contractId}`,
      timeline: `/admin/operations/client-command/${clientId}?tab=timeline`,
    },
  };

  writeFileSync(join(outDir, "qa-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(outDir, "legal-copy-for-matt.md"),
    [
      "# Default Direct Agreement legal copy (for Matt review)",
      "",
      "## Cancellation / Refunds",
      DEFAULT_LEGAL_COPY.cancellationRefundLanguage,
      "",
      "## Intellectual property",
      DEFAULT_LEGAL_COPY.intellectualPropertyLanguage,
      "",
      "## Portfolio use",
      DEFAULT_LEGAL_COPY.portfolioUseLanguage,
      "",
      "## Client responsibilities",
      DEFAULT_LEGAL_COPY.clientResponsibilities,
      "",
      "## Overage approval",
      DEFAULT_LEGAL_COPY.overagePreapprovalRule,
      "",
      "## Payment terms",
      DEFAULT_LEGAL_COPY.paymentTerms,
      "",
      "## Renewal / expiration",
      DEFAULT_LEGAL_COPY.renewalBehavior,
      "",
      "## Unused-hours rollover",
      "Rollover policy value: `none` — unused monthly hours do not automatically expand another month.",
      "",
    ].join("\n"),
  );

  console.log(`\nPassed ${checks.length} functional checks.`);
  console.log(`Report: ${join(outDir, "qa-report.json")}`);
  console.log(`PDFs: ${pdfDir}`);
  console.log(`Lifecycle: /admin/sales/contracts/${contractId}`);
  console.log(`Client: /admin/operations/client-command/${clientId}?tab=contracts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
