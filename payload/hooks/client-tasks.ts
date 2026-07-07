import type { CollectionAfterChangeHook } from "payload";
import { publishWorkItemActivity } from "@/lib/client-command/activity/publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as AnyDoc).id);
  }
  return null;
}

export const publishClientTaskActivityHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const clientId = relId(doc.client);
  if (!clientId) return doc;

  const taskId = doc.id as number;
  const title = String(doc.title ?? "Work item");
  const status = String(doc.status ?? "backlog");
  const previousStatus = previousDoc ? String((previousDoc as AnyDoc).status ?? "") : "";
  const projectId = relId(doc.project) ?? undefined;
  const requestId = relId(doc.relatedRequest) ?? undefined;
  const sourceType = doc.sourceType ? String(doc.sourceType) : undefined;

  try {
    if (operation === "create") {
      await publishWorkItemActivity(
        {
          clientId,
          taskId,
          eventType: "work.created",
          title: `Work item created · ${title}`,
          summary: `Status: ${status.replace(/-/g, " ")}.`,
          status,
          sourceType,
          projectId,
          requestId,
          timestamp: doc.createdAt ? String(doc.createdAt) : undefined,
        },
        req.payload,
      );
      return doc;
    }

    if (status === "completed" && previousStatus !== "completed") {
      await publishWorkItemActivity(
        {
          clientId,
          taskId,
          eventType: "work.completed",
          title: `Work completed · ${title}`,
          summary: String(doc.category ?? "general"),
          status,
          sourceType,
          projectId,
          requestId,
        },
        req.payload,
      );
      return doc;
    }

    if (status === "blocked" && previousStatus !== "blocked") {
      await publishWorkItemActivity(
        {
          clientId,
          taskId,
          eventType: "work.blocked",
          title: `Work blocked · ${title}`,
          summary: doc.blockedReason ? String(doc.blockedReason) : undefined,
          status,
          sourceType,
          projectId,
          requestId,
        },
        req.payload,
      );
      return doc;
    }

    if (previousStatus && status !== previousStatus) {
      await publishWorkItemActivity(
        {
          clientId,
          taskId,
          eventType: "work.status-changed",
          title: `Work updated · ${title}`,
          summary: `${previousStatus.replace(/-/g, " ")} → ${status.replace(/-/g, " ")}`,
          status,
          sourceType,
          projectId,
          requestId,
        },
        req.payload,
      );
    }
  } catch (err) {
    console.error("[KXD Work Items] Activity Engine publish failed:", err);
  }

  return doc;
};
