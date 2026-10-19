import { NextResponse } from "next/server";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { getStaffPreviewSession } from "@/lib/staff/preview";
import { staffMayAccessClient } from "@/lib/staff/client-assignments";
import {
  createStaffClientNote,
  listStaffClientNotesForClient,
} from "@/lib/staff/client-notes/data";
import type { StaffClientNoteKind } from "@/lib/staff/client-notes/policy";
import { isRestrictedStaff } from "@/lib/staff/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.notes.internal");
  if (gated instanceof NextResponse) return gated;

  const { searchParams } = new URL(request.url);
  const clientId = Number(searchParams.get("clientId"));
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json(
      { success: false, error: "Valid clientId is required." },
      { status: 400 },
    );
  }

  if (isRestrictedStaff(gated.actor)) {
    const allowed = await staffMayAccessClient(gated.actor, clientId);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Staff permission denied: client not in assigned scope.",
        },
        { status: 403 },
      );
    }
  }

  const notes = await listStaffClientNotesForClient(clientId);
  return NextResponse.json({ success: true, notes });
}

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("staff.notes.internal");
  if (gated instanceof NextResponse) return gated;

  const preview = await getStaffPreviewSession();
  if (preview) {
    return NextResponse.json(
      { success: false, error: "Preview mode is read-only." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    clientId?: number;
    kind?: StaffClientNoteKind;
    body?: string;
  };

  const clientId = Number(body.clientId);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json(
      { success: false, error: "Valid clientId is required." },
      { status: 400 },
    );
  }

  const kind: StaffClientNoteKind = body.kind === "question" ? "question" : "note";

  const result = await createStaffClientNote({
    actor: gated.actor,
    clientId,
    kind,
    body: typeof body.body === "string" ? body.body : "",
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ success: true, note: result.note });
}
