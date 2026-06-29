import { NextResponse } from "next/server";
import { updateClientAction } from "@/lib/client-command/actions/data";
import type {
  ClientActionPriority,
  ClientActionStatus,
  UpdateClientActionInput,
} from "@/lib/client-command/actions/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const actionId = Number(id);
    if (!actionId) {
      return NextResponse.json(
        { success: false, error: "Valid action id is required." },
        { status: 400 },
      );
    }

    const body = (await req.json()) as UpdateClientActionInput;
    const doc = await updateClientAction(actionId, {
      status: body.status as ClientActionStatus | undefined,
      priority: body.priority as ClientActionPriority | undefined,
      assignedTo: body.assignedTo,
      dueDate: body.dueDate,
      completionNotes: body.completionNotes,
      result: body.result,
      executiveNotes: body.executiveNotes,
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Action not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, id: doc.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update action.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
