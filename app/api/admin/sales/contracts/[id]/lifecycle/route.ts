import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  applyLocalReviewedKxdInvoiceConfig,
  reviewed,
} from "@/lib/proposal-lifecycle/billing-identity";
import {
  prepareMockStripeDraftsForContract,
  processLifecycleMockPaymentWebhook,
  resolveClientBillingIdentity,
  sendContractForClientSignature,
  signContractAsOperator,
  simulateVerifiedInitialPayment,
  voidContract,
} from "@/lib/proposal-lifecycle/services";
import { generateAndFileExecutedPackage } from "@/lib/proposal-lifecycle/documents/file";
import { getContractLifecycle } from "@/lib/proposal-lifecycle/services";
import { newLifecycleId } from "@/lib/proposal-lifecycle/hash";
import {
  ensureLifecycleStripeTestCustomer,
  prepareLifecycleStripeTestInvoice,
} from "@/lib/proposal-lifecycle/stripe-test/service";
import { redactStripeId } from "@/lib/stripe/commercial-credentials";
import { resolveCommercialStripeTestCredentials } from "@/lib/stripe/commercial-credentials";
import {
  activateDirectAgreementService,
  finalizeDirectAgreement,
  linkPaymentReferences,
  recordExternalAcceptance,
  recordExternalPayment,
  recordPaymentAuthorization,
} from "@/lib/direct-agreement";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const actor = String((auth as { email?: string }).email ?? "operator");

  try {
    switch (action) {
      case "finalize-direct-agreement": {
        const result = await finalizeDirectAgreement({ contractId: id, actor });
        return NextResponse.json({
          ok: true,
          commercialStatus: result.pkg.commercialStatus,
          documentRefs: result.pkg.documentRefs ?? [],
        });
      }
      case "record-external-acceptance": {
        const result = await recordExternalAcceptance({
          contractId: id,
          acceptedBy: String(body.acceptedBy ?? ""),
          acceptedAt: String(body.acceptedAt ?? ""),
          method: String(body.method ?? ""),
          evidenceNotes: String(body.evidenceNotes ?? ""),
          evidenceReference: body.evidenceReference
            ? String(body.evidenceReference)
            : null,
          actor,
          operatorLegalName: body.operatorLegalName
            ? String(body.operatorLegalName)
            : undefined,
          operatorTitle: body.operatorTitle ? String(body.operatorTitle) : undefined,
          operatorEmail: body.operatorEmail ? String(body.operatorEmail) : undefined,
        });
        return NextResponse.json({
          ok: true,
          commercialStatus: result.pkg.commercialStatus,
          acceptanceMode: "external-acceptance",
          documentRefs: result.pkg.documentRefs ?? [],
        });
      }
      case "record-payment-authorization": {
        const result = await recordPaymentAuthorization({
          contractId: id,
          actor,
          payload: body,
        });
        return NextResponse.json({
          ok: true,
          authorization: result.pkg.paymentAuthorization,
        });
      }
      case "link-payment-references": {
        const result = await linkPaymentReferences({
          contractId: id,
          actor,
          markPaid: body.markPaid === true,
          references: {
            stripeCustomerId: body.stripeCustomerId
              ? String(body.stripeCustomerId)
              : null,
            stripeInvoiceId: body.stripeInvoiceId ? String(body.stripeInvoiceId) : null,
            stripePaymentIntentId: body.stripePaymentIntentId
              ? String(body.stripePaymentIntentId)
              : null,
            stripeChargeId: body.stripeChargeId ? String(body.stripeChargeId) : null,
            hostedInvoiceUrl: body.hostedInvoiceUrl
              ? String(body.hostedInvoiceUrl)
              : null,
            receiptUrl: body.receiptUrl ? String(body.receiptUrl) : null,
            paymentStatus: body.paymentStatus ? String(body.paymentStatus) : null,
            source: body.source
              ? (String(body.source) as
                  | "imported-external-stripe-payment"
                  | "kxd-stripe-lifecycle"
                  | "manual-non-stripe")
              : undefined,
            livemode:
              body.livemode === true ? true : body.livemode === false ? false : null,
            amountCents:
              body.amountCents != null && body.amountCents !== ""
                ? Number(body.amountCents)
                : null,
            currency: body.currency ? String(body.currency) : null,
            paidAt: body.paidAt ? String(body.paidAt) : null,
            operatorNote: body.operatorNote ? String(body.operatorNote) : null,
            idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : null,
          },
        });
        return NextResponse.json({
          ok: true,
          commercialStatus: result.pkg.commercialStatus,
          paymentReferences: result.pkg.paymentReferences,
        });
      }
      case "record-external-payment": {
        const result = await recordExternalPayment({
          contractId: id,
          actor,
          payment: {
            source: String(body.source ?? "") as
              | "imported-external-stripe-payment"
              | "kxd-stripe-lifecycle"
              | "manual-non-stripe",
            amountCents: Number(body.amountCents),
            currency: String(body.currency ?? "USD"),
            paidAt: String(body.paidAt ?? ""),
            livemode:
              body.livemode === true ? true : body.livemode === false ? false : null,
            stripeCustomerId: body.stripeCustomerId
              ? String(body.stripeCustomerId)
              : null,
            stripePaymentIntentId: body.stripePaymentIntentId
              ? String(body.stripePaymentIntentId)
              : null,
            stripeChargeId: body.stripeChargeId ? String(body.stripeChargeId) : null,
            stripeInvoiceId: body.stripeInvoiceId ? String(body.stripeInvoiceId) : null,
            receiptUrl: body.receiptUrl ? String(body.receiptUrl) : null,
            hostedInvoiceUrl: body.hostedInvoiceUrl
              ? String(body.hostedInvoiceUrl)
              : null,
            operatorNote: body.operatorNote ? String(body.operatorNote) : null,
          },
        });
        return NextResponse.json({
          ok: true,
          commercialStatus: result.pkg.commercialStatus,
          paymentReferences: result.pkg.paymentReferences,
          idempotentReplay: result.idempotentReplay,
          billingProfile: result.billingProfile,
          confirmation: result.confirmation,
          noStripeMutation: true,
        });
      }
      case "activate-direct-agreement-service": {
        const result = await activateDirectAgreementService({ contractId: id, actor });
        return NextResponse.json({
          ok: true,
          commercialStatus: result.pkg.commercialStatus,
        });
      }
      case "sign-operator": {
        const result = await signContractAsOperator(id, {
          legalName: String(body.legalName ?? ""),
          title: String(body.title ?? ""),
          entityName: String(body.entityName ?? "Kreate by Design"),
          email: String(body.email ?? actor),
          typedAcknowledgment: String(body.typedAcknowledgment ?? body.legalName ?? ""),
          authorityConfirmed: Boolean(body.authorityConfirmed),
          electronicRecordsConsent: Boolean(body.electronicRecordsConsent),
          actor,
        });
        return NextResponse.json({ ok: true, status: result.contract.status });
      }
      case "send-for-client-signature": {
        const result = await sendContractForClientSignature({
          contractId: id,
          recipientName: String(body.recipientName ?? ""),
          recipientEmail: String(body.recipientEmail ?? ""),
          createdBy: actor,
          forceDespiteBillingBlockers: Boolean(body.forceDespiteBillingBlockers),
        });
        return NextResponse.json({
          ok: true,
          signingUrl: result.signingUrl,
          preview: {
            label: result.preview.label,
            subject: result.preview.subject,
            bodyText: result.preview.bodyText,
            recipientEmail: result.preview.recipientEmail,
            secureUrlRedacted: result.preview.secureUrl,
          },
        });
      }
      case "void": {
        const pkg = await voidContract(id, {
          reason: String(body.reason ?? ""),
          actor,
        });
        return NextResponse.json({ ok: true, voidReason: pkg.voidReason });
      }
      case "resolve-readiness-fields": {
        const pkg = await resolveClientBillingIdentity(id, {
          legalName: body.legalName ? String(body.legalName) : undefined,
          billingEmail: body.billingEmail ? String(body.billingEmail) : undefined,
          billingAddress: body.billingAddress ? String(body.billingAddress) : undefined,
          taxTreatment: body.taxTreatment as "exclusive" | "inclusive" | "exempt" | undefined,
          actor,
        });
        if (body.applyLocalKxdFixture === true) {
          applyLocalReviewedKxdInvoiceConfig({
            legalEntity: reviewed("Kreate by Design LLC (local fixture)", actor),
            mailingAddress: reviewed("Local fixture mailing address", actor),
            billingEmail: reviewed("billing@localhost.invalid", actor),
            remittanceInformation: reviewed(
              "Local fixture remittance — not for production",
              actor,
            ),
            invoiceNumberingConfigured: true,
            invoiceNumberingState: "reviewed",
          });
          await resolveClientBillingIdentity(id, {
            legalName: body.legalName ? String(body.legalName) : undefined,
            billingEmail: body.billingEmail ? String(body.billingEmail) : undefined,
            billingAddress: body.billingAddress ? String(body.billingAddress) : undefined,
            taxTreatment: body.taxTreatment as "exclusive" | "inclusive" | "exempt" | undefined,
            actor,
          });
        }
        return NextResponse.json({
          ok: true,
          blockers: (pkg.billingReadinessIssues ?? [])
            .filter((i) => i.severity === "blocker")
            .map((i) => i.code),
        });
      }
      case "prepare-mock-stripe": {
        const pkg = await prepareMockStripeDraftsForContract(id);
        return NextResponse.json({
          ok: true,
          mockStripe: pkg.billingPlan?.mockStripe ?? null,
          livemode: false,
        });
      }
      case "simulate-mock-payment": {
        const useWebhook = body.viaWebhook !== false;
        if (useWebhook) {
          const { pkg: current } = await getContractLifecycle(id);
          const initial = current.billingPlan?.obligations.find((o) => o.kind === "initial");
          if (!initial) throw new Error("No initial obligation.");
          const pkg = await processLifecycleMockPaymentWebhook(id, {
            id: String(body.eventId ?? `evt_mock_${newLifecycleId("pay")}`),
            type: "invoice.paid",
            livemode: false,
            obligationId: initial.id,
            amountCents: initial.amountCents,
            currency: initial.currency,
            clientId: undefined,
          });
          return NextResponse.json({
            ok: true,
            onboardingEligible: pkg.onboardingEligible,
            livemode: false,
          });
        }
        const pkg = await simulateVerifiedInitialPayment(id);
        return NextResponse.json({
          ok: true,
          onboardingEligible: pkg.onboardingEligible,
          livemode: false,
        });
      }
      case "regenerate-documents": {
        const { contract, pkg, canonical, proposal } = await getContractLifecycle(id);
        if (!pkg.executedCertificate || !pkg.operatorSignature) {
          throw new Error("Contract must be executed before regenerating documents.");
        }
        if (!pkg.structuredPaymentTerms) {
          throw new Error("Missing payment terms.");
        }
        if (!pkg.clientSignature && !pkg.externalAcceptance) {
          throw new Error("Missing client signature or external acceptance evidence.");
        }
        const clientId =
          typeof contract.client === "object"
            ? Number((contract.client as { id: number }).id)
            : Number(contract.client);
        if (!clientId) throw new Error("Client relationship required to regenerate documents.");
        const next = await generateAndFileExecutedPackage({
          contractId: id,
          proposalId: proposal ? Number(proposal.id) : null,
          clientId,
          proposalNumber: String(
            proposal?.proposalNumber ?? pkg.structuredPaymentTerms.sourceProposalNumber ?? "",
          ),
          contractTitle: String(contract.title ?? ""),
          contractBody: String(contract.body ?? ""),
          canonical: canonical ?? null,
          certificate: pkg.executedCertificate,
          operator: pkg.operatorSignature,
          client:
            pkg.clientSignature ??
            ({
              legalName: pkg.externalAcceptance?.acceptedBy ?? "External acceptance",
              title: "External acceptance (not e-sign)",
              entityName: "Client",
              email: "",
              typedAcknowledgment: "EXTERNAL_ACCEPTANCE_NOT_ELECTRONIC_SIGNATURE",
              authorityConfirmed: false,
              electronicRecordsConsent: false,
              consentDisclosureVersion: "external-acceptance-v1",
              consentText: "External acceptance",
              signedAt: pkg.externalAcceptance?.acceptedAt ?? new Date().toISOString(),
              ipAddress: null,
              userAgent: null,
              actorRole: "client",
              documentHash: pkg.executedCertificate.documentHash,
              signatureHash: "external",
            } as never),
          terms: pkg.structuredPaymentTerms,
          pkg,
          externalAcceptance: pkg.externalAcceptance ?? null,
        });
        const { getPayload } = await import("payload");
        const config = (await import("@payload-config")).default;
        const payload = await getPayload({ config });
        await payload.update({
          collection: "contracts" as never,
          id,
          data: { lifecyclePackage: next } as never,
          overrideAccess: true,
        });
        return NextResponse.json({
          ok: true,
          documentRefs: next.documentRefs ?? [],
        });
      }
      case "stripe-test-credential-status": {
        const creds = resolveCommercialStripeTestCredentials();
        return NextResponse.json({
          ok: true,
          testMode: true,
          configured: creds.ok,
          code: creds.ok ? null : creds.code,
          message: creds.ok
            ? "Stripe test credentials resolved (secret not returned)."
            : creds.message,
          source: creds.ok ? creds.source : null,
          webhookConfigured: creds.ok ? Boolean(creds.webhookSecret) : false,
        });
      }
      case "stripe-test-ensure-customer": {
        if (body.confirmed !== true) {
          throw new Error("Set confirmed:true to create/reuse a Stripe test customer.");
        }
        const result = await ensureLifecycleStripeTestCustomer({
          contractId: id,
          actor,
          confirmed: true,
        });
        return NextResponse.json({
          ok: true,
          testMode: true,
          livemode: false,
          customerIdRedacted: redactStripeId(result.customerId),
          reused: result.reused,
          accountIdRedacted: redactStripeId(result.accountId),
          label: "Stripe test customer",
        });
      }
      case "stripe-test-prepare-invoice": {
        if (body.confirmed !== true) {
          throw new Error("Set confirmed:true to prepare a Stripe test invoice.");
        }
        const result = await prepareLifecycleStripeTestInvoice({
          contractId: id,
          actor,
          confirmed: true,
        });
        return NextResponse.json({
          ok: true,
          testMode: true,
          livemode: false,
          invoiceIdRedacted: redactStripeId(result.invoiceId),
          amountCents: result.amountCents,
          currency: result.currency,
          hostedInvoiceUrl: result.hostedInvoiceUrl,
          label: "TEST MODE — NOT A REAL INVOICE",
          notice:
            "Pay with Stripe test cards only. Onboarding eligibility requires a verified webhook — activation remains manual.",
        });
      }
      default:
        return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
