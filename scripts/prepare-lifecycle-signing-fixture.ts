/**
 * Stops after operator sign + simulated client delivery so the signing URL remains valid for browser QA.
 * NEVER touches Proposal ID 1.
 *
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --env-file=.env.local \
 *     --import ./scripts/shims/register-server-only.mjs \
 *     scripts/prepare-lifecycle-signing-fixture.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { dollarsToCents } from "../lib/proposal-builder/money.ts";
import { emptyProposalDocument, newId } from "../lib/proposal-builder/document.ts";
import { createProposal, acceptProposal } from "../lib/proposal-builder/services.ts";
import {
  ensureLifecycleHydrated,
  resolveClientBillingIdentity,
  sendContractForClientSignature,
  signContractAsOperator,
  simulateLocalProposalSend,
} from "../lib/proposal-lifecycle/services.ts";
import {
  applyLocalReviewedKxdInvoiceConfig,
  reviewed,
} from "../lib/proposal-lifecycle/billing-identity.ts";

function assertLocal(): void {
  const uri = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (/neon\.tech|vercel-storage|amazonaws\.com/i.test(uri)) throw new Error("Refusing cloud database");
  const host = new URL(uri).hostname;
  const db = new URL(uri).pathname.replace(/^\//, "").split("?")[0];
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(host);
  if (db !== "kxd_audit_report_review") throw new Error(db);
}

async function main() {
  assertLocal();
  const outDir = join(process.cwd(), "tmp", "proposal-lifecycle-qa", "phase-completion");
  mkdirSync(outDir, { recursive: true });

  const doc = emptyProposalDocument({
    organizations: [{ id: newId("org"), name: "Signing QA Org" }],
    contacts: [
      {
        id: newId("contact"),
        name: "Jordan QA",
        email: "jordan.qa@localhost.invalid",
        title: "Director",
        phone: "(555) 010-3030",
        isPrimary: true,
      },
    ],
    executive: {
      clientFacingIntro: "Signing fixture.",
      executiveSummary: "Browser signing QA fixture.",
      objectives: "Valid client signing page.",
      recommendedDirection: "Local only.",
    },
    scopeGroups: [
      {
        id: newId("scope"),
        title: "Signing QA Scope",
        overview: "Scope",
        deliverables: [{ id: newId("d"), title: "Deliverable", sortOrder: 1 }],
        inclusion: "included",
        sortOrder: 1,
      },
    ],
    pricingLines: [
      {
        id: newId("line"),
        title: "Fixture build",
        cadence: "one-time",
        inclusion: "included",
        quantity: 1,
        unitPriceCents: dollarsToCents(1000),
        sortOrder: 1,
      },
    ],
    credits: [],
    paymentSchedule: [
      {
        id: newId("pay"),
        label: "Deposit",
        due: "at-acceptance",
        amountCents: dollarsToCents(1000),
        sortOrder: 1,
      },
    ],
    depositCents: dollarsToCents(1000),
    terms: {
      proposalTerms: "Terms",
      paymentAssumptions: "Assumptions",
      nextSteps: "Accept",
      closingNote: "QA",
    },
  });

  const created = await createProposal({
    title: "LOCAL QA — Valid Client Signing Fixture",
    document: doc,
  });
  const proposalId = Number(created.id);
  if (proposalId === 1) throw new Error("Protected ID 1");

  const send = await simulateLocalProposalSend({
    proposalId,
    recipientName: "Jordan QA",
    recipientEmail: "jordan.qa@localhost.invalid",
    createdBy: "signing-qa",
  });
  const token = send.publicUrl.split("/proposal/")[1];
  const accepted = await acceptProposal(token!, {
    name: "Jordan QA",
    title: "Director",
    organization: "Signing QA Org",
    email: "jordan.qa@localhost.invalid",
    authorityConfirmed: true,
    reviewedConfirmed: true,
    typedAcknowledgment: "Jordan QA",
    ipAddress: "127.0.0.1",
    userAgent: "signing-qa",
  });
  const contractId = accepted.contractId!;
  await ensureLifecycleHydrated(contractId);
  applyLocalReviewedKxdInvoiceConfig({
    legalEntity: reviewed("Kreate by Design LLC (local fixture)"),
    mailingAddress: reviewed("Local fixture mailing address"),
    billingEmail: reviewed("billing@localhost.invalid"),
    remittanceInformation: reviewed("Local fixture remittance"),
    invoiceNumberingConfigured: true,
    invoiceNumberingState: "reviewed",
  });
  await resolveClientBillingIdentity(contractId, {
    legalName: "Signing QA Org",
    billingEmail: "jordan.qa@localhost.invalid",
    billingAddress: "200 Fixture Ave, Local QA, OR 97479",
    taxTreatment: "exclusive",
    actor: "signing-qa",
  });
  await signContractAsOperator(contractId, {
    legalName: "Matt KXD",
    title: "Principal",
    entityName: "Kreate by Design",
    email: "matt@localhost.invalid",
    typedAcknowledgment: "Matt KXD",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actor: "signing-qa",
  });
  const sent = await sendContractForClientSignature({
    contractId,
    recipientName: "Jordan QA",
    recipientEmail: "jordan.qa@localhost.invalid",
    createdBy: "signing-qa",
  });

  const summary = {
    proposalId,
    contractId,
    publicProposal: send.publicUrl,
    validClientSigningUrl: sent.preview.secureUrl,
    contractWorkspace: `http://localhost:3000/admin/sales/contracts/${contractId}`,
  };
  writeFileSync(join(outDir, "valid-signing-fixture.json"), JSON.stringify(summary, null, 2));
  writeFileSync(join(outDir, "valid-client-signing-url.txt"), `${sent.preview.secureUrl}\n`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
