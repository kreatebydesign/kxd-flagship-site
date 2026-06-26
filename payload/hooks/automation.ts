/**
 * Automation hooks — publish standardized events when KXD OS records change.
 */

import type { CollectionAfterChangeHook } from "payload";
import { publishers } from "@/lib/automation/publishers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveClientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return (raw as AnyDoc).id as number;
  }
  return null;
}

export const publishRetainerAutomation: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== "create") return doc;

  const clientId = resolveClientId(doc.client);
  if (!clientId) return doc;

  try {
    await publishers.growth.retainerCreated(
      {
        clientId,
        retainerId: doc.id as number,
        retainerName: String(doc.retainerName ?? "Retainer"),
        monthlyAmount: typeof doc.monthlyAmount === "number" ? doc.monthlyAmount : undefined,
      },
      req.payload,
    );
  } catch (err) {
    console.error("[KXD Automation] Retainer publish failed:", err);
  }

  return doc;
};

export const publishProjectAutomation: CollectionAfterChangeHook = async ({
  doc,
  req,
  previousDoc,
}) => {
  const clientId = resolveClientId(doc.client);
  if (!clientId) return doc;

  const prevStatus = previousDoc?.status as string | undefined;
  const newStatus = doc.status as string;

  if (newStatus === "launched" && prevStatus !== "launched") {
    try {
      await publishers.projects.completed(
        {
          clientId,
          projectId: doc.id as number,
          projectName: String(doc.projectName ?? doc.title ?? "Project"),
        },
        req.payload,
      );
    } catch (err) {
      console.error("[KXD Automation] Project publish failed:", err);
    }
  }

  return doc;
};

export const publishInfrastructureEventAutomation: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== "create") return doc;
  if (String(doc.severity) !== "critical") return doc;

  const clientId = resolveClientId(doc.client);
  if (!clientId) return doc;

  try {
    await publishers.infrastructure.criticalEvent(
      {
        clientId,
        title: String(doc.title ?? "Critical infrastructure event"),
        description: doc.description ? String(doc.description) : undefined,
        infrastructureId:
          typeof doc.infrastructure === "number"
            ? doc.infrastructure
            : typeof doc.infrastructure === "object" && doc.infrastructure !== null
              ? Number((doc.infrastructure as AnyDoc).id)
              : undefined,
        eventId: doc.id as number,
      },
      req.payload,
    );
  } catch (err) {
    console.error("[KXD Automation] Infrastructure event publish failed:", err);
  }

  return doc;
};
