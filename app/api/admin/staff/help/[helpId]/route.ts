import { NextResponse } from "next/server";
import { requireAdminOversightApi } from "@/lib/staff/guard";
import { respondToHelpRequest } from "@/lib/staff/help-requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ helpId: string }> };

/** Matt answers a help request (status → answered). */
export async function POST(request: Request, context: RouteContext) {
  const gated = await requireAdminOversightApi();
  if (gated instanceof NextResponse) return gated;

  const { helpId: raw } = await context.params;
  const helpId = Number(raw);
  if (!Number.isFinite(helpId) || helpId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid help request id." },
      { status: 400 },
    );
  }

  const body = (await request.json()) as { response?: string; resolve?: boolean };
  const result = await respondToHelpRequest({
    helpId,
    response: typeof body.response === "string" ? body.response : "",
    resolve: Boolean(body.resolve),
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, request: result.request });
}

/** Matt resolves a help request (status → resolved), optionally with a final note. */
export async function PUT(request: Request, context: RouteContext) {
  const gated = await requireAdminOversightApi();
  if (gated instanceof NextResponse) return gated;

  const { helpId: raw } = await context.params;
  const helpId = Number(raw);
  if (!Number.isFinite(helpId) || helpId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid help request id." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { response?: string };
  const result = await respondToHelpRequest({
    helpId,
    response:
      typeof body.response === "string" && body.response.trim()
        ? body.response
        : "Resolved.",
    resolve: true,
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, request: result.request });
}
