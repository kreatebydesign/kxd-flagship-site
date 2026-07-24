import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getStaffPreviewSession } from "@/lib/staff/preview";
import {
  createStaffHelpRequest,
  listHelpRequestsForStaff,
} from "@/lib/staff/help-requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gated = await requireStaffCapabilityApi("staff.help.request");
  if (gated instanceof NextResponse) return gated;

  const requests = await listHelpRequestsForStaff(gated.actor.userId, {
    includeResolved: true,
  });
  return NextResponse.json({ success: true, requests });
}

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.help.request");
  if (gated instanceof NextResponse) return gated;

  const preview = await getStaffPreviewSession();
  if (preview) {
    return NextResponse.json(
      { success: false, error: "Preview mode is read-only." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    question?: string;
    pagePath?: string;
    workId?: number | null;
  };

  const result = await createStaffHelpRequest({
    actor: gated.actor,
    question: typeof body.question === "string" ? body.question : "",
    pagePath:
      typeof body.pagePath === "string"
        ? body.pagePath
        : "/admin/operations/staff",
    workId: typeof body.workId === "number" ? body.workId : null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  const req = result.request;
  let message: string;
  if (result.duplicate) {
    message =
      "You already asked about this recently. Showing your existing request.";
  } else if (req.requiresMatt) {
    message =
      "KXD Intelligence replied. Matt still needs to confirm — it is in his review queue.";
  } else if (req.intelligenceResponse) {
    message = "KXD Intelligence replied.";
  } else {
    message = "Your question was saved.";
  }

  return NextResponse.json({
    success: true,
    request: req,
    duplicate: result.duplicate,
    message,
  });
}
