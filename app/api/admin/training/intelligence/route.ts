import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  isMentorCapabilityId,
  requestOperationsGuidance,
} from "@/lib/kxd-intelligence/operations-mentor";
import {
  getTrainingPermissions,
  learnerKeyFromUser,
  learnerLabelFromUser,
} from "@/lib/training/permissions";

export const dynamic = "force-dynamic";

/**
 * Operations Intelligence Mentor — intentional requests only.
 * No GET. No background generation on page load.
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const permissions = getTrainingPermissions(auth);
  if (!permissions.canRead) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  let body: {
    capability?: string;
    pathSlug?: string;
    lessonSlug?: string;
    checklistCompletedIds?: string[];
    learnerNote?: string | null;
    clientRequestKey?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const capability = body.capability?.trim() ?? "";
  if (!isMentorCapabilityId(capability)) {
    return NextResponse.json(
      { success: false, error: "Unknown mentor action." },
      { status: 400 },
    );
  }

  const result = await requestOperationsGuidance({
    learnerKey: learnerKeyFromUser(auth),
    learnerLabel: learnerLabelFromUser(auth),
    request: {
      capability,
      pathSlug: body.pathSlug?.trim() ?? "",
      lessonSlug: body.lessonSlug?.trim() ?? "",
      checklistCompletedIds: Array.isArray(body.checklistCompletedIds)
        ? body.checklistCompletedIds
        : [],
      learnerNote: body.learnerNote ?? null,
      clientRequestKey: body.clientRequestKey ?? null,
    },
  });

  if ("error" in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, guidance: result });
}
