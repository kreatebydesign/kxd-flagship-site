import type { CollectionAfterChangeHook } from "payload";

export const notifyInquiryCreated: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;

  try {
    const { routeInquiryNotification } = await import(
      "../../lib/inquiries/route-notification.ts"
    );

    await routeInquiryNotification(doc, req.payload);
  } catch (error) {
    req.payload.logger.error({
      msg: "Failed to route inquiry notification",
      err: error,
    });
  }

  return doc;
};
