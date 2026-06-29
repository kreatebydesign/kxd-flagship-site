import type { CollectionAfterChangeHook } from "payload";
import { publishActionLifecycle } from "@/lib/client-command/actions/timeline";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export const publishClientActionActivityHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  try {
    await publishActionLifecycle(
      doc as AnyDoc,
      previousDoc ? String((previousDoc as AnyDoc).status ?? "") : undefined,
      operation === "create" ? "create" : "update",
      req.payload,
    );
  } catch (err) {
    console.error("[KXD Actions] timeline publish failed:", err);
  }
  return doc;
};
