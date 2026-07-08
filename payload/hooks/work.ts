import type { CollectionAfterChangeHook } from "payload";
import {
  assignWorkNumber,
  publishWorkEventFromDoc,
  resolveLifecycleEvent,
} from "@/lib/work/integration";
import type { WorkStatus } from "@/lib/work/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    return Number((value as AnyDoc).id) || null;
  }
  return null;
}

export const publishWorkActivityHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const clientId = relId(doc.client);
  if (!clientId) return doc;

  const timelineEnabled = Boolean(doc.timelineEnabled ?? true);
  if (!timelineEnabled) return doc;

  const status = String(doc.status ?? "new") as WorkStatus;
  const previousStatus = previousDoc ? (String((previousDoc as AnyDoc).status ?? "") as WorkStatus) : null;

  try {
    if (operation === "create") {
      await assignWorkNumber(doc.id as number);
    }

    const event = resolveLifecycleEvent(
      status,
      previousStatus,
      operation === "create" ? "create" : "update",
    );

    if (operation === "create" || (previousStatus && status !== previousStatus)) {
      await publishWorkEventFromDoc(
        doc as AnyDoc,
        event,
        previousStatus,
        req.payload,
      );
    }
  } catch (err) {
    console.error("[KXD Work Integration] Timeline publish failed:", err);
  }

  return doc;
};
