import type { Payload } from "payload";
import { publishClientActivity } from "@/lib/client-command/activity/publish";
import type { ClientActionDoc, ClientActionStatus } from "./types";

const TIMELINE_EVENT_FOR_STATUS: Partial<Record<ClientActionStatus, string>> = {
  "in-progress": "action.assigned",
  completed: "action.completed",
  dismissed: "action.dismissed",
  archived: "action.archived",
  waiting: "action.escalated",
};

export async function publishActionTimelineEvent(
  doc: ClientActionDoc,
  eventType: string,
  payload?: Payload,
): Promise<void> {
  const clientId =
    typeof doc.client === "object" && doc.client !== null
      ? Number((doc.client as ClientActionDoc).id)
      : Number(doc.client);

  if (!clientId || !doc.id) return;

  await publishClientActivity(
    {
      clientId,
      sourceModule: "Client Command",
      sourceType: "client-action",
      sourceId: `${doc.id}:${eventType}`,
      eventType,
      title: `${eventType.replace("action.", "Action ")} · ${String(doc.title)}`,
      summary: doc.description ? String(doc.description).slice(0, 200) : undefined,
      timestamp: new Date().toISOString(),
      status: String(doc.status ?? "pending"),
      priority:
        doc.priority === "critical"
          ? "critical"
          : doc.priority === "high"
            ? "high"
            : doc.priority === "low"
              ? "low"
              : "normal",
      relatedLinks: [
        {
          label: "Open action",
          href: `/admin/operations/client-command/${clientId}?tab=actions`,
        },
      ],
      metadata: {
        actionId: doc.id,
        actionType: doc.actionType,
        memoryReference: doc.memoryReference,
      },
    },
    payload,
  );
}

export async function publishActionLifecycle(
  doc: ClientActionDoc,
  previousStatus: string | undefined,
  operation: "create" | "update",
  payload?: Payload,
): Promise<void> {
  if (operation === "create") {
    await publishActionTimelineEvent(doc, "action.created", payload);
    return;
  }

  const status = String(doc.status ?? "");
  if (status !== previousStatus && TIMELINE_EVENT_FOR_STATUS[status as ClientActionStatus]) {
    await publishActionTimelineEvent(
      doc,
      TIMELINE_EVENT_FOR_STATUS[status as ClientActionStatus]!,
      payload,
    );
  }
}
