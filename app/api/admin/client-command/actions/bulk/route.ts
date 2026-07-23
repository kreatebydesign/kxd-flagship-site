import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { bulkUpdateClientActions } from "@/lib/client-command/actions/data";
import type {
  BulkClientActionInput,
  ClientActionPriority,
  ClientActionStatus,
} from "@/lib/client-command/actions/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as BulkClientActionInput;

    if (!body.ids?.length) {
      return NextResponse.json(
        { success: false, error: "ids array is required." },
        { status: 400 },
      );
    }

    const updated = await bulkUpdateClientActions({
      ids: body.ids,
      status: body.status as ClientActionStatus | undefined,
      priority: body.priority as ClientActionPriority | undefined,
      assignedTo: body.assignedTo,
      dueDate: body.dueDate,
    });

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk update failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
