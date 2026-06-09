import type { CollectionAfterChangeHook } from "payload";

export const notifyInquiryCreated: CollectionAfterChangeHook = async ({
  doc,
}) => {
  // Inquiry notifications are now handled directly inside
  // app/api/inquiries/route.ts using Resend.
  //
  // This hook is intentionally disabled to prevent duplicate
  // notifications and stale logging from legacy Payload hooks.

  return doc;
};