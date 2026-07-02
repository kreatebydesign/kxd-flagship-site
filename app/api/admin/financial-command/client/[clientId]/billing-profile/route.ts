import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { upsertBillingProfile } from "@/lib/financial-command/billing-profile";
import type { BillingStatus } from "@/lib/financial-command/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId } = await params;
  const body = await req.json().catch(() => ({}));

  const profile = await upsertBillingProfile(Number(clientId), {
    billingContact: body.billingContact,
    billingEmail: body.billingEmail,
    paymentPreference: body.paymentPreference,
    invoiceCadence: body.invoiceCadence,
    paymentTerms: body.paymentTerms,
    billingStatus: body.billingStatus as BillingStatus | undefined,
    executiveNotes: body.executiveNotes,
  });

  return NextResponse.json({ success: true, profile });
}
