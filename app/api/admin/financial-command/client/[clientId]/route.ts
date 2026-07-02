import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { loadClientFinancialSnapshot } from "@/lib/financial-command/data";
import { buildFinancialIntelligence } from "@/lib/financial-command/intelligence";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clientId } = await params;
  const id = Number(clientId);
  const financial = await loadClientFinancialSnapshot(id);
  const intelligence = buildFinancialIntelligence(
    id,
    financial,
    financial.billingProfile,
    [],
  );

  return NextResponse.json({
    success: true,
    financial,
    intelligence,
  });
}
