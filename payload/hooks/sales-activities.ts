import type { CollectionAfterChangeHook } from "payload";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveId(rel: AnyDoc | number | null | undefined): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  return (rel.id as number) ?? null;
}

export const onSalesActivityCreated: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;
  if (doc.timelinePublished) return doc;

  const clientId = resolveId(doc.client);
  if (!clientId) return doc;

  try {
    await createExecutiveEvent(
      {
        client: clientId,
        eventType: `sales.${String(doc.activityType ?? "note")}`,
        title: String(doc.title ?? "Sales activity"),
        summary: doc.summary ? String(doc.summary) : undefined,
        category: "relationship",
        importance: "normal",
        sourceModule: "Growth",
        occurredAt: doc.occurredAt
          ? new Date(String(doc.occurredAt)).toISOString()
          : new Date().toISOString(),
        metadata: {
          salesActivityId: doc.id,
          activityType: doc.activityType,
          leadId: resolveId(doc.lead),
          proposalId: resolveId(doc.proposal),
        },
      },
      req.payload,
    );

    await req.payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-activities" as any,
      id: doc.id as number,
      data: { timelinePublished: true },
      overrideAccess: true,
    });
  } catch (err) {
    console.error("[KXD Sales] Failed to publish activity to timeline:", err);
  }

  return doc;
};
