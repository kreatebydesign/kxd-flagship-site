import { NextResponse } from "next/server";
import { updateClientCommunication } from "@/lib/client-command/communications/data";
import type {
  ClientCommunicationPriority,
  ClientCommunicationStatus,
} from "@/lib/client-command/communications/types";

export const dynamic = "force-dynamic";

type PatchBody = {
  status?: ClientCommunicationStatus;
  priority?: ClientCommunicationPriority;
  followUpDate?: string | null;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const communicationId = Number(id);

  if (!communicationId) {
    return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as PatchBody;
    const doc = await updateClientCommunication(communicationId, {
      status: body.status,
      priority: body.priority,
      followUpDate: body.followUpDate,
    });

    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: doc.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
