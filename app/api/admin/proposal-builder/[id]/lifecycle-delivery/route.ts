import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { simulateLocalProposalSend } from "@/lib/proposal-lifecycle/services";

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

  try {
    const body = (await req.json().catch(() => ({}))) as {
      recipientName?: string;
      recipientEmail?: string;
    };
    const result = await simulateLocalProposalSend({
      proposalId: id,
      recipientName: String(body.recipientName ?? ""),
      recipientEmail: String(body.recipientEmail ?? ""),
      createdBy: String((auth as { email?: string }).email ?? "operator"),
    });
    return NextResponse.json({
      ok: true,
      publicUrl: result.publicUrl,
      preview: {
        label: result.preview.label,
        subject: result.preview.subject,
        bodyText: result.preview.bodyText,
        recipientEmail: result.preview.recipientEmail,
      },
      status: result.proposal.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delivery simulation failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
