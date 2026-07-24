import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import {
  buildStaffPreviewSession,
  setStaffPreviewCookie,
} from "@/lib/staff/preview";
import { publishActivity } from "@/lib/activity-engine/publish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gated = await requireStaffCapabilityApi("admin.preview-staff");
  if (gated instanceof NextResponse) return gated;

  let body: { staffUserId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const staffUserId = Number(body.staffUserId);
  if (!Number.isFinite(staffUserId) || staffUserId <= 0) {
    return NextResponse.json(
      { success: false, error: "staffUserId is required." },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });
  const staff = await payload.findByID({
    collection: "users",
    id: staffUserId,
    depth: 0,
    overrideAccess: true,
  });

  if (!staff) {
    return NextResponse.json(
      { success: false, error: "Staff user not found." },
      { status: 404 },
    );
  }

  const staffRole = (staff as { staffRole?: string }).staffRole;
  if (!staffRole || staffRole === "none") {
    return NextResponse.json(
      { success: false, error: "User is not configured with a staff role." },
      { status: 400 },
    );
  }

  const email = typeof staff.email === "string" ? staff.email : "";
  const displayName =
    typeof (staff as { displayName?: string }).displayName === "string" &&
    (staff as { displayName?: string }).displayName!.trim()
      ? (staff as { displayName: string }).displayName.trim()
      : email || `User ${staffUserId}`;

  const session = buildStaffPreviewSession({
    staffUserId,
    staffLabel: displayName,
    adminUserId: gated.actor.userId,
  });
  await setStaffPreviewCookie(session);

  try {
    await publishActivity({
      eventType: "staff.preview-started",
      title: `Staff preview started · ${displayName}`,
      summary: "Administrator opened read-only staff experience preview.",
      sourceModule: "Activity Engine",
      importance: "low",
      occurredAt: new Date().toISOString(),
      metadata: {
        staffUserId,
        adminUserId: gated.actor.userId,
        readOnly: true,
      },
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({
    success: true,
    redirectTo: "/admin/operations/staff",
  });
}
