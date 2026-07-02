import type { CollectionAfterChangeHook } from "payload";
import { statusToContractEvent } from "@/lib/contracts/lifecycle";
import { publishContractLifecycleEvent } from "@/lib/contracts/timeline-publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export const publishContractLifecycleHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const contractId = doc.id as number;
  const status = String(doc.status ?? "draft");
  const previousStatus = String((previousDoc as AnyDoc | undefined)?.status ?? "");

  try {
    if (operation === "create") {
      await publishContractLifecycleEvent(
        doc as AnyDoc,
        "contract.created",
        req.payload,
        "Contract drafted from proposal conversion.",
      );
      return doc;
    }

    const eventType = statusToContractEvent(status, previousStatus);
    if (eventType) {
      await publishContractLifecycleEvent(
        doc as AnyDoc,
        eventType,
        req.payload,
        `Status changed to ${status.replace(/-/g, " ")}.`,
      );
    }
  } catch (err) {
    console.error("[KXD Contracts] Lifecycle hook failed:", contractId, err);
  }

  return doc;
};
