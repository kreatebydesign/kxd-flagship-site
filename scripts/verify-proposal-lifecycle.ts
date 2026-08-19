/**
 * Focused verification for proposal lifecycle domain (no DB required for pure units).
 *   npx tsx scripts/verify-proposal-lifecycle.ts
 */
import { dollarsToCents } from "../lib/proposal-builder/money.ts";
import { emptyProposalDocument, newId } from "../lib/proposal-builder/document.ts";
import { buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { canTransitionContract } from "../lib/proposal-builder/lifecycle.ts";
import { deriveStructuredPaymentTerms, reconcileInstallments } from "../lib/proposal-lifecycle/structured-payment-terms.ts";
import { assessBillingReadiness, hasBlockers } from "../lib/proposal-lifecycle/billing-readiness.ts";
import { buildTypedSignature, ELECTRONIC_SIGNATURE_CONSENT_VERSION } from "../lib/proposal-lifecycle/signatures.ts";
import { buildProposedBillingPlan } from "../lib/proposal-lifecycle/billing-plan.ts";
import { prepareMockStripeDrafts, applyMockInvoicePaid } from "../lib/proposal-lifecycle/mock-stripe-billing.ts";
import { sealExecutedAgreement, computeDocumentHash, hashPaymentTerms } from "../lib/proposal-lifecycle/executed-seal.ts";
import { buildLocalDeliveryPreview } from "../lib/proposal-lifecycle/delivery-preview.ts";
import { humanProgressionFromStatuses } from "../lib/proposal-lifecycle/progression.ts";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import { hashPublicToken, timingSafeEqualHex, sha256Hex } from "../lib/proposal-lifecycle/hash.ts";
import {
  canTransitionBillingPlan,
  canTransitionObligation,
  assertNotProtectedProposal,
  assertContractMutable,
  PROTECTED_PROPOSAL_ID,
} from "../lib/proposal-lifecycle/transitions.ts";
import { processMockWebhookEvent } from "../lib/proposal-lifecycle/mock-webhook.ts";
import { buildLifecycleEmail, EMAIL_TEMPLATE_VERSION } from "../lib/proposal-lifecycle/email-templates.ts";
import {
  applyLocalReviewedKxdInvoiceConfig,
  getKxdInvoiceConfig,
  resetLocalReviewedKxdInvoiceConfig,
  reviewed,
} from "../lib/proposal-lifecycle/billing-identity.ts";
import { redactSecureUrl, scrubTokenFromText } from "../lib/proposal-lifecycle/token-redaction.ts";
import { resolveStoragePath } from "../lib/proposal-lifecycle/documents/storage-path.ts";
import { verifyCommercialDocumentIntegrity } from "../lib/proposal-lifecycle/documents/integrity.ts";
import { isSigningLinkExpired } from "../lib/proposal-lifecycle/token-expiry.ts";
import { join } from "path";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("\nProposal lifecycle verification\n");

check(
  "operator sign path: approved-for-signature → partially-signed",
  canTransitionContract("approved-for-signature", "partially-signed"),
);
check(
  "send after operator sign: partially-signed → sent-for-signature",
  canTransitionContract("partially-signed", "sent-for-signature"),
);
check(
  "client seal: sent-for-signature → executed",
  canTransitionContract("sent-for-signature", "executed"),
);

const doc = emptyProposalDocument({
  organizations: [{ id: newId("org"), name: "Fixture Org LLC" }],
  contacts: [
    {
      id: newId("c"),
      name: "Alex Fixture",
      email: "alex@fixture.local",
      title: "Director",
      isPrimary: true,
    },
  ],
  pricingLines: [
    {
      id: newId("line"),
      title: "Website build",
      cadence: "one-time",
      inclusion: "included",
      quantity: 1,
      unitPriceCents: dollarsToCents(1000),
      isAddon: false,
      sortOrder: 1,
    },
    {
      id: newId("line"),
      title: "Monthly management",
      cadence: "monthly",
      inclusion: "included",
      quantity: 1,
      unitPriceCents: dollarsToCents(200),
      isAddon: false,
      sortOrder: 2,
    },
  ],
  paymentSchedule: [
    {
      id: newId("pay"),
      label: "Project deposit",
      due: "at-acceptance",
      amountCents: dollarsToCents(500),
      sortOrder: 1,
    },
    {
      id: newId("pay"),
      label: "Final payment",
      due: "remaining",
      amountCents: dollarsToCents(500),
      sortOrder: 2,
    },
  ],
  depositCents: dollarsToCents(500),
});

const canonical = buildCanonicalProposal({
  id: 9001,
  proposalNumber: "KXD-P-QA-LIFECYCLE",
  title: "Lifecycle Fixture Proposal",
  status: "accepted-contract-pending",
  proposalDate: "2026-07-30",
  expiresAt: "2026-08-29T12:00:00.000Z",
  revisionNumber: 1,
  builderDocument: doc,
});

const terms = deriveStructuredPaymentTerms(canonical, "hash-demo");
const recon = reconcileInstallments(terms);
check("installments reconcile to one-time total", recon.ok && recon.differenceCents === 0);
check("monthly amount preserved", terms.monthlyTotalCents === dollarsToCents(200));
check("recurring start trigger is launch-gated", terms.recurring.startTrigger === "after-launch-verified");

const issues = assessBillingReadiness({
  canonical,
  terms,
  pkg: emptyLifecyclePackage(),
  clientLegalName: "Fixture Org LLC",
  billingEmail: "billing@fixture.local",
  billingAddressPresent: false,
  operatorSigned: false,
});
check("readiness has blockers without signature/config", hasBlockers(issues));
check(
  "missing KXD invoice identity is a blocker",
  issues.some((i) => i.code === "missing-kxd-invoice-identity"),
);

const docHash = computeDocumentHash({
  contractId: 42,
  contractBody: "DRAFT BODY",
  acceptedSnapshotHash: "snap",
  paymentTermsHash: hashPaymentTerms(terms),
  version: 1,
});

let typedOk = false;
try {
  buildTypedSignature({
    legalName: "Matt Operator",
    title: "Principal",
    entityName: "Kreate by Design",
    email: "ops@fixture.local",
    typedAcknowledgment: "Wrong Name",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actorRole: "kxd-operator",
    documentHash: docHash,
  });
} catch {
  typedOk = true;
}
check("typed acknowledgment must match legal name", typedOk);

const opSig = buildTypedSignature({
  legalName: "Matt Operator",
  title: "Principal",
  entityName: "Kreate by Design",
  email: "ops@fixture.local",
  typedAcknowledgment: "Matt Operator",
  authorityConfirmed: true,
  electronicRecordsConsent: true,
  actorRole: "kxd-operator",
  documentHash: docHash,
});
const clientSig = buildTypedSignature({
  legalName: "Alex Fixture",
  title: "Director",
  entityName: "Fixture Org LLC",
  email: "alex@fixture.local",
  typedAcknowledgment: "Alex Fixture",
  authorityConfirmed: true,
  electronicRecordsConsent: true,
  actorRole: "client",
  documentHash: docHash,
});
check("consent version set", opSig.consentDisclosureVersion === ELECTRONIC_SIGNATURE_CONSENT_VERSION);

const cert = sealExecutedAgreement({
  contractId: 42,
  proposalId: 9001,
  proposalNumber: "KXD-P-QA-LIFECYCLE",
  proposalVersion: 1,
  contractVersion: 1,
  documentHash: docHash,
  operator: opSig,
  client: clientSig,
});
check("certificate verification id present", Boolean(cert.verificationId));

const plan = buildProposedBillingPlan({
  contractId: 42,
  proposalId: 9001,
  proposalNumber: "KXD-P-QA-LIFECYCLE",
  contractVersion: 1,
  contractHash: docHash,
  terms,
  issues: issues.filter((i) => i.code === "tax-unspecified"), // still blocked
});
check("plan blocked while readiness blockers remain", plan.status === "blocked");

const clearIssues = assessBillingReadiness({
  canonical,
  terms: {
    ...terms,
    taxes: { treatment: "exclusive", notes: "Reviewed for fixture" },
  },
  pkg: { ...emptyLifecyclePackage(), operatorSignature: opSig },
  clientLegalName: "Fixture Org LLC",
  billingEmail: "billing@fixture.local",
  billingAddressPresent: true,
  operatorSigned: true,
});
// Still blocked by KXD invoice config — expected
check("KXD config still blocks Stripe prep", hasBlockers(clearIssues));

// Force a reviewable plan by passing empty issues (unit-level Stripe mock path)
const reviewPlan = buildProposedBillingPlan({
  contractId: 42,
  proposalId: 9001,
  proposalNumber: "KXD-P-QA-LIFECYCLE",
  contractVersion: 1,
  contractHash: docHash,
  terms,
  issues: [],
});
check("plan ready when issues empty", reviewPlan.status === "ready-for-review");
const mocked = prepareMockStripeDrafts(reviewPlan);
check("mock customer id prefixed", mocked.bundle.customerId.startsWith("cus_mock_"));
check("mock invoice drafts created", mocked.bundle.draftInvoiceIds.length === 2);
check("mock schedule for recurring", Boolean(mocked.bundle.inactiveScheduleId));
check("livemode false", mocked.bundle.livemode === false);

const paid = applyMockInvoicePaid(
  mocked.plan,
  mocked.plan.obligations.find((o) => o.kind === "initial")!.id,
);
check("initial obligation marked paid", paid.obligations[0].status === "paid");

const preview = buildLocalDeliveryPreview({
  kind: "proposal-send",
  recipientName: "Alex Fixture",
  recipientEmail: "alex@fixture.local",
  subject: "Test",
  bodyText: "Body",
  secureUrl: "http://localhost:3000/proposal/token",
});
check("delivery preview simulated label", preview.label.includes("SIMULATED"));
check("delivery mode local-simulated", preview.mode === "local-simulated");

check(
  "human progression after acceptance",
  humanProgressionFromStatuses({
    proposalStatus: "accepted-contract-pending",
    contractStatus: "draft",
  }) === "Accepted — Contract Required" ||
    humanProgressionFromStatuses({
      proposalStatus: "accepted-contract-pending",
      contractStatus: "draft",
    }) === "Contract Drafted",
);

const a = hashPublicToken("abc");
check("timing-safe equal works", timingSafeEqualHex(a, a));
check("timing-safe rejects mismatch", !timingSafeEqualHex(a, hashPublicToken("xyz")));

check("billing plan blocked→ready allowed", canTransitionBillingPlan("blocked", "ready-for-review"));
check("obligation paid is terminal", !canTransitionObligation("paid", "sent"));
check("protected proposal id is 1", PROTECTED_PROPOSAL_ID === 1);
try {
  assertNotProtectedProposal(1, "send");
  const uri = process.env.DATABASE_URI || process.env.DATABASE_URL || "";
  const local =
    /kxd_audit_report_review/.test(uri) && /127\.0\.0\.1|localhost/.test(uri);
  check("ID1 guard throws on local audit DB only", !local);
} catch {
  check("ID1 guard throws on local audit DB only", true);
}

const email = buildLifecycleEmail({
  kind: "contract-send",
  recipientName: "Taylor",
  contractTitle: "Fixture Agreement",
  secureUrl: "http://localhost:3000/contract/token",
});
check("email template version set", email.templateVersion === EMAIL_TEMPLATE_VERSION);
check("email has html", email.bodyHtml.includes("<p"));

resetLocalReviewedKxdInvoiceConfig();
check("kxd legal unresolved by default", getKxdInvoiceConfig().legalEntity.state === "unresolved");
applyLocalReviewedKxdInvoiceConfig({
  legalEntity: reviewed("Fixture LLC"),
  mailingAddress: reviewed("1 Test St"),
  billingEmail: reviewed("billing@fixture.local"),
  remittanceInformation: reviewed("Fixture remittance"),
  invoiceNumberingConfigured: true,
  invoiceNumberingState: "reviewed",
});
check("kxd legal reviewed after fixture", getKxdInvoiceConfig().legalEntity.state === "reviewed");
resetLocalReviewedKxdInvoiceConfig();

const webhookPlan = mocked.plan;
const evt1 = processMockWebhookEvent({
  event: {
    id: "evt_mock_dup1",
    type: "invoice.paid",
    livemode: false,
    contractId: 42,
    obligationId: webhookPlan.obligations[0].id,
    amountCents: webhookPlan.obligations[0].amountCents,
    currency: "USD",
    receivedAt: new Date().toISOString(),
  },
  plan: webhookPlan,
  processedEventIds: [],
  expectedContractId: 42,
});
check("mock webhook pays obligation", Boolean(evt1.ok && evt1.plan?.obligations[0].status === "paid"));
const evtReplay = processMockWebhookEvent({
  event: {
    id: "evt_mock_dup1",
    type: "invoice.paid",
    livemode: false,
    contractId: 42,
    obligationId: webhookPlan.obligations[0].id,
    amountCents: webhookPlan.obligations[0].amountCents,
    currency: "USD",
    receivedAt: new Date().toISOString(),
  },
  plan: evt1.plan!,
  processedEventIds: evt1.processedEventIds,
  expectedContractId: 42,
});
check("mock webhook replay is duplicate-safe", Boolean(evtReplay.duplicate && evtReplay.ok));
const liveReject = processMockWebhookEvent({
  event: {
    id: "evt_mock_live",
    type: "invoice.paid",
    livemode: true,
    contractId: 42,
    obligationId: webhookPlan.obligations[0].id,
    receivedAt: new Date().toISOString(),
  },
  plan: webhookPlan,
  processedEventIds: [],
  expectedContractId: 42,
});
check("livemode true fails closed", liveReject.ok === false);
const amountMismatch = processMockWebhookEvent({
  event: {
    id: "evt_mock_amt",
    type: "invoice.paid",
    livemode: false,
    contractId: 42,
    obligationId: webhookPlan.obligations[0].id,
    amountCents: 1,
    currency: "USD",
    receivedAt: new Date().toISOString(),
  },
  plan: webhookPlan,
  processedEventIds: [],
  expectedContractId: 42,
});
check("amount mismatch rejected", amountMismatch.ok === false);

const wrongClient = processMockWebhookEvent({
  event: {
    id: "evt_mock_client",
    type: "invoice.paid",
    livemode: false,
    contractId: 42,
    clientId: 999,
    obligationId: webhookPlan.obligations[0].id,
    amountCents: webhookPlan.obligations[0].amountCents,
    currency: "USD",
    receivedAt: new Date().toISOString(),
  },
  plan: webhookPlan,
  processedEventIds: [],
  expectedContractId: 42,
  expectedClientId: 7,
});
check("wrong webhook clientId rejected", wrongClient.ok === false);

const wrongContract = processMockWebhookEvent({
  event: {
    id: "evt_mock_contract",
    type: "invoice.paid",
    livemode: false,
    contractId: 99,
    obligationId: webhookPlan.obligations[0].id,
    amountCents: webhookPlan.obligations[0].amountCents,
    currency: "USD",
    receivedAt: new Date().toISOString(),
  },
  plan: webhookPlan,
  processedEventIds: [],
  expectedContractId: 42,
});
check("wrong webhook contractId rejected", wrongContract.ok === false);

const missingMode = processMockWebhookEvent({
  event: {
    id: "evt_mock_nomode",
    type: "invoice.paid",
    // @ts-expect-error intentional missing livemode
    livemode: undefined,
    contractId: 42,
    obligationId: webhookPlan.obligations[0].id,
    amountCents: webhookPlan.obligations[0].amountCents,
    currency: "USD",
    receivedAt: new Date().toISOString(),
  },
  plan: webhookPlan,
  processedEventIds: [],
  expectedContractId: 42,
});
check("missing livemode fails closed", missingMode.ok === false);

const realLookingId = processMockWebhookEvent({
  event: {
    id: "evt_1A2B3Creal",
    type: "invoice.paid",
    livemode: false,
    contractId: 42,
    obligationId: webhookPlan.obligations[0].id,
    amountCents: webhookPlan.obligations[0].amountCents,
    currency: "USD",
    receivedAt: new Date().toISOString(),
  },
  plan: webhookPlan,
  processedEventIds: [],
  expectedContractId: 42,
});
check("real-looking Stripe event id rejected", realLookingId.ok === false);

const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCD";
const fullUrl = `http://localhost:3000/contract/${token}`;
check("secure URL redacts token", !redactSecureUrl(fullUrl).includes(token));
check("body scrubs raw token", !scrubTokenFromText(`Link ${fullUrl}`, token).includes(token));

const previewPersisted = buildLocalDeliveryPreview({
  kind: "contract-signature-send",
  recipientName: "A",
  recipientEmail: "a@localhost.invalid",
  subject: "S",
  bodyText: `Please sign ${fullUrl}`,
  secureUrl: fullUrl,
  rawToken: token,
});
check(
  "persisted preview has no raw token",
  !previewPersisted.secureUrl.includes(token) && !previewPersisted.bodyText.includes(token),
);

check("expired signing link detected", isSigningLinkExpired(new Date(Date.now() - 1000).toISOString()));
check("future signing link not expired", !isSigningLinkExpired(new Date(Date.now() + 60_000).toISOString()));

try {
  assertContractMutable("executed");
  check("executed contract not mutable", false);
} catch {
  check("executed contract not mutable", true);
}

const root = join(process.cwd(), "storage", "commercial-documents");
try {
  resolveStoragePath(root, "../etc/passwd");
  check("storage traversal rejected", false);
} catch {
  check("storage traversal rejected", true);
}

const pdfBuf = Buffer.from("%PDF-1.4 fixture");
const goodHash = sha256Hex(pdfBuf.toString("base64"));
check(
  "pdf integrity matches filed algorithm",
  verifyCommercialDocumentIntegrity({
    buffer: pdfBuf,
    contentHash: goodHash,
    mimeType: "application/pdf",
  }).ok,
);
check(
  "tampered pdf integrity fails",
  !verifyCommercialDocumentIntegrity({
    buffer: Buffer.from("%PDF-1.4 tampered"),
    contentHash: goodHash,
    mimeType: "application/pdf",
  }).ok,
);

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
