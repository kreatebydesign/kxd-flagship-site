import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requireStaffCapabilityApi } from "@/lib/staff/guard";
import { publishActivity } from "@/lib/activity-engine/publish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const gated = await requireStaffCapabilityApi("staff.home");
  if (gated instanceof NextResponse) return gated;

  const payload = await getPayload({ config });
  await payload.update({
    collection: "users",
    id: gated.actor.userId,
    data: {
      staffOnboardingCompletedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });

  try {
    await publishActivity({
      eventType: "staff.onboarding-completed",
      title: `Staff onboarding completed · ${gated.actor.displayName}`,
      summary: "First-login staff welcome completed.",
      sourceModule: "Activity Engine",
      importance: "normal",
      occurredAt: new Date().toISOString(),
      metadata: {
        staffUserId: gated.actor.userId,
        aiAssisted: false,
      },
    });
  } catch {
    /* activity publish is best-effort */
  }

  return NextResponse.json({
    success: true,
    redirectTo: "/admin/operations/staff",
  });
}
