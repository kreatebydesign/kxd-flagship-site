import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createDirectAgreement } from "@/lib/direct-agreement";

export const dynamic = "force-dynamic";

/**
 * POST — create a Direct Agreement for an existing client (no proposal).
 */
export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const actor = String((auth as { email?: string }).email ?? "operator");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const agreementTerms = (body.agreementTerms ?? {}) as Record<string, unknown>;
    const result = await createDirectAgreement({
      clientId: Number(body.clientId),
      title: String(body.title ?? ""),
      contractType: String(body.contractType ?? "service-agreement"),
      publicTitle: body.publicTitle ? String(body.publicTitle) : null,
      body: String(body.body ?? ""),
      terms: body.terms ? String(body.terms) : null,
      executiveNotes: body.executiveNotes ? String(body.executiveNotes) : null,
      templateId: body.templateId ? Number(body.templateId) : null,
      actor,
      agreementTerms: {
        commercialStructure: (agreementTerms.commercialStructure as "one-time") ?? "one-time",
        oneTimeAmountCents: Number(agreementTerms.oneTimeAmountCents ?? 0),
        monthlyAmountCents: Number(agreementTerms.monthlyAmountCents ?? 0),
        serviceStartDate: String(agreementTerms.serviceStartDate ?? ""),
        serviceEndDate: agreementTerms.serviceEndDate
          ? String(agreementTerms.serviceEndDate)
          : null,
        scope: String(agreementTerms.scope ?? ""),
        includedServices: String(agreementTerms.includedServices ?? ""),
        exclusions: String(agreementTerms.exclusions ?? ""),
        capacityHoursPerMonth:
          agreementTerms.capacityHoursPerMonth == null || agreementTerms.capacityHoursPerMonth === ""
            ? null
            : Number(agreementTerms.capacityHoursPerMonth),
        rolloverPolicy: (agreementTerms.rolloverPolicy as "none") ?? "none",
        revisionAllowance: String(agreementTerms.revisionAllowance ?? ""),
        overagePreapprovalRule: String(agreementTerms.overagePreapprovalRule ?? ""),
        paymentTerms: String(agreementTerms.paymentTerms ?? ""),
        cancellationRefundLanguage: String(agreementTerms.cancellationRefundLanguage ?? ""),
        intellectualPropertyLanguage: String(agreementTerms.intellectualPropertyLanguage ?? ""),
        portfolioUseLanguage: String(agreementTerms.portfolioUseLanguage ?? ""),
        clientResponsibilities: String(agreementTerms.clientResponsibilities ?? ""),
        renewalBehavior: String(agreementTerms.renewalBehavior ?? ""),
        autoRenew: Boolean(agreementTerms.autoRenew),
        billingContactName: agreementTerms.billingContactName
          ? String(agreementTerms.billingContactName)
          : null,
        billingEmail: agreementTerms.billingEmail ? String(agreementTerms.billingEmail) : null,
        payerLegalName: agreementTerms.payerLegalName
          ? String(agreementTerms.payerLegalName)
          : null,
        brandName: agreementTerms.brandName ? String(agreementTerms.brandName) : null,
      },
    });

    return NextResponse.json({
      ok: true,
      contractId: result.contractId,
      proposalCreated: false,
      agreementSource: "direct-agreement",
      href: `/admin/sales/contracts/${result.contractId}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Create failed." },
      { status: 400 },
    );
  }
}
