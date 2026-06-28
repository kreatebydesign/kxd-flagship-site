import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { skipPlaybookStep } from "@/lib/playbooks";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const stepId = Number(body.stepId);
  if (!stepId) {
    return NextResponse.json({ success: false, error: "stepId required" }, { status: 400 });
  }

  const result = await skipPlaybookStep(Number(id), stepId);
  return NextResponse.json(result);
}
