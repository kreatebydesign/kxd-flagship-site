import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createClientCommunication } from "@/lib/client-command/communications/data";
import type {
  ClientCommunicationDirection,
  ClientCommunicationPriority,
  ClientCommunicationStatus,
  ClientCommunicationType,
  CreateClientCommunicationInput,
} from "@/lib/client-command/communications/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as CreateClientCommunicationInput;

    if (!body.clientId || !body.type) {
      return NextResponse.json(
        { success: false, error: "clientId and type are required." },
        { status: 400 },
      );
    }

    const doc = await createClientCommunication({
      clientId: body.clientId,
      type: body.type as ClientCommunicationType,
      direction: body.direction as ClientCommunicationDirection | undefined,
      subject: body.subject,
      summary: body.summary,
      bodyPreview: body.bodyPreview,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      date: body.date,
      status: body.status as ClientCommunicationStatus | undefined,
      priority: body.priority as ClientCommunicationPriority | undefined,
      followUpDate: body.followUpDate,
      source: body.source,
      relatedProjectId: body.relatedProjectId,
      relatedRequestId: body.relatedRequestId,
      participants: body.participants,
      metadata: body.metadata,
    });

    return NextResponse.json({
      success: true,
      id: doc.id,
      href: `/admin/collections/client-communications/${doc.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create communication.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
