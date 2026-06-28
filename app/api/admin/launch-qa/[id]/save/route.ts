import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { saveLaunchQaChecklist } from "@/lib/launch-qa";
import type { LaunchQaChecklistItem } from "@/lib/launch-qa";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const qaId = Number(id);
  if (!qaId) {
    return NextResponse.json({ success: false, message: "Invalid QA id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      checklistItems?: LaunchQaChecklistItem[];
      websiteUrl?: string;
      launchDate?: string;
      notes?: string;
      checkedBy?: string;
    };

    if (!body.checklistItems) {
      return NextResponse.json({ success: false, message: "Missing checklist." }, { status: 400 });
    }

    const checkedBy =
      body.checkedBy ||
      (auth as { email?: string }).email ||
      (auth as { name?: string }).name ||
      undefined;

    const result = await saveLaunchQaChecklist(qaId, {
      checklistItems: body.checklistItems,
      websiteUrl: body.websiteUrl,
      launchDate: body.launchDate,
      notes: body.notes,
      checkedBy,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, detail: result.detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
