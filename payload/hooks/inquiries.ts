import type { CollectionAfterChangeHook } from "payload";
import { routeInquiryNotification } from "@/lib/inquiries/route-notification";

export const notifyInquiryCreated: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;

  try {
    await routeInquiryNotification(doc, req.payload);
  } catch (error) {
    req.payload.logger.error({
      msg: "Failed to route inquiry notification",
      err: error,
    });
  }

  return doc;
};
