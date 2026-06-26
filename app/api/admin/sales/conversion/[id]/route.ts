import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { executeProposalConversion, getConversionWizardData } from "@/lib/sales/acquisition";
import type { ConversionWizardDraft } from "@/lib/sales/acquisition";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const data = await getConversionWizardData(Number(id));
  if (!data) {
    return NextResponse.json({ success: false, error: "Proposal not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, ...data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const draft = body.draft as ConversionWizardDraft | undefined;

  const result = await executeProposalConversion(Number(id), undefined, draft);
  if (!result.success) {
    return NextResponse.json({ success: false, errors: result.errors }, { status: 400 });
  }

  return NextResponse.json({ success: true, result });
}
