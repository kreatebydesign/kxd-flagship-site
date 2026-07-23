import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  createClientAction,
  loadClientActions,
} from "@/lib/client-command/actions/data";
import type {
  ClientActionPriority,
  ClientActionSource,
  ClientActionStatus,
  ClientActionType,
  CreateClientActionInput,
} from "@/lib/client-command/actions/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const clientId = Number(searchParams.get("clientId"));
  if (!clientId) {
    return NextResponse.json(
      { success: false, error: "clientId is required." },
      { status: 400 },
    );
  }

  const snapshot = await loadClientActions(clientId);
  return NextResponse.json({ success: true, snapshot });
}

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as CreateClientActionInput;

    if (!body.clientId || !body.title) {
      return NextResponse.json(
        { success: false, error: "clientId and title are required." },
        { status: 400 },
      );
    }

    const doc = await createClientAction({
      clientId: body.clientId,
      title: body.title,
      description: body.description,
      source: body.source as ClientActionSource | undefined,
      priority: body.priority as ClientActionPriority | undefined,
      status: body.status as ClientActionStatus | undefined,
      actionType: body.actionType as ClientActionType | undefined,
      createdBy: body.createdBy,
      assignedTo: body.assignedTo,
      dueDate: body.dueDate,
      memoryReference: body.memoryReference,
      relatedCommunicationId: body.relatedCommunicationId,
      relatedProjectId: body.relatedProjectId,
      relatedRequestId: body.relatedRequestId,
      executiveNotes: body.executiveNotes,
    });

    return NextResponse.json({
      success: true,
      id: doc.id,
      href: `/admin/collections/client-actions/${doc.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create action.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
