import type { Payload } from "payload";
import {
  publishClientActivity,
  publishEmailActivity,
} from "@/lib/client-command/activity/publish";
import type { ExecutiveTimelineImportance } from "@/lib/executive-timeline/types";
import type {
  ClientCommunicationDoc,
  ClientCommunicationType,
} from "./types";

function priorityToImportance(
  priority: string | undefined,
): ExecutiveTimelineImportance {
  switch (priority) {
    case "urgent":
      return "critical";
    case "high":
      return "high";
    case "low":
      return "low";
    default:
      return "normal";
  }
}

function activityTitle(doc: ClientCommunicationDoc): string {
  const type = String(doc.type ?? "communication");
  const label = type.replace(/_/g, " ");
  const subject = doc.subject ? String(doc.subject) : doc.summary ? String(doc.summary).slice(0, 60) : label;
  return `${label} · ${subject}`;
}

function activitySummary(doc: ClientCommunicationDoc): string | undefined {
  const parts: string[] = [];
  if (doc.direction) parts.push(String(doc.direction));
  if (doc.contactName) parts.push(String(doc.contactName));
  if (doc.summary) parts.push(String(doc.summary).slice(0, 200));
  else if (doc.bodyPreview) parts.push(String(doc.bodyPreview).slice(0, 200));
  return parts.length ? parts.join(" · ") : undefined;
}

/**
 * Publishes timeline activity for a client communication record.
 */
export async function publishCommunicationActivity(
  doc: ClientCommunicationDoc,
  payload?: Payload,
): Promise<void> {
  const clientId =
    typeof doc.client === "object" && doc.client !== null
      ? Number((doc.client as ClientCommunicationDoc).id)
      : Number(doc.client);

  if (!clientId || !doc.id) return;

  const communicationId = doc.id as number;
  const type = String(doc.type ?? "note") as ClientCommunicationType;
  const title = activityTitle(doc);
  const summary = activitySummary(doc);
  const timestamp = doc.date ? String(doc.date) : doc.createdAt ? String(doc.createdAt) : undefined;
  const importance = priorityToImportance(String(doc.priority ?? "normal"));
  const href = `/admin/operations/client-command/${clientId}?tab=emails`;

  if (type === "email") {
    await publishEmailActivity(
      {
        clientId,
        sourceId: communicationId,
        title,
        summary,
        timestamp,
      },
      payload,
    );
    return;
  }

  await publishClientActivity(
    {
      clientId,
      sourceModule: "Communications",
      sourceType: "client-communication",
      sourceId: communicationId,
      eventType: `communication.${type}`,
      title,
      summary,
      details: doc.bodyPreview ? String(doc.bodyPreview) : undefined,
      timestamp,
      status: doc.status ? String(doc.status) : undefined,
      priority: importance,
      metadata: {
        communicationType: type,
        direction: doc.direction,
        contactEmail: doc.contactEmail,
      },
      relatedLinks: [{ label: "Open communications", href }],
    },
    payload,
  );
}
