import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  approveLaunchQa,
  createTaskFromFailedItem,
  markLaunchQaLaunched,
  updateLaunchQaItem,
} from "@/lib/launch-qa";
import type { LaunchQaItemStatus } from "@/lib/launch-qa";

export async function POST(
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

  const body = (await request.json()) as {
    action?: string;
    itemId?: string;
    status?: LaunchQaItemStatus;
    notes?: string;
  };

  const approvedBy =
    (auth as { email?: string }).email ||
    (auth as { name?: string }).name ||
    "KXD Admin";

  try {
    switch (body.action) {
      case "approve":
        const approved = await approveLaunchQa(qaId, approvedBy);
        if (!approved.success) {
          return NextResponse.json({ success: false, message: approved.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, detail: approved.detail });

      case "launched":
        const launched = await markLaunchQaLaunched(qaId);
        if (!launched.success) {
          return NextResponse.json({ success: false, message: launched.error }, { status: 400 });
        }
        return NextResponse.json({ success: true });

      case "update-item":
        if (!body.itemId || !body.status) {
          return NextResponse.json({ success: false, message: "Missing itemId or status." }, { status: 400 });
        }
        const updated = await updateLaunchQaItem(qaId, body.itemId, {
          status: body.status,
          notes: body.notes,
        });
        if (!updated.success) {
          return NextResponse.json({ success: false, message: updated.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, detail: updated.detail });

      case "create-task":
        if (!body.itemId) {
          return NextResponse.json({ success: false, message: "Missing itemId." }, { status: 400 });
        }
        const task = await createTaskFromFailedItem(qaId, body.itemId);
        if (!task.success) {
          return NextResponse.json({ success: false, message: task.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, taskId: task.taskId, href: task.href });

      default:
        return NextResponse.json({ success: false, message: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
