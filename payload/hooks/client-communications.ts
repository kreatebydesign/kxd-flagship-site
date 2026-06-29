import type { CollectionAfterChangeHook } from "payload";
import { publishCommunicationActivity } from "@/lib/client-command/communications/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export const publishCommunicationActivityHook: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;

  try {
    await publishCommunicationActivity(doc as AnyDoc, req.payload);
  } catch (err) {
    console.error("[KXD Communications] activity publish failed:", err);
  }

  return doc;
};
