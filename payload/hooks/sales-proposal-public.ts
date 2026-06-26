import type { CollectionBeforeChangeHook } from "payload";
import { generatePublicToken } from "@/lib/sales/public-core";

export const onProposalCreate: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if (operation === "create" && !data.publicToken) {
    data.publicToken = generatePublicToken();
  }
  if (!data.agreementText) {
    data.agreementText =
      "By signing below, the client agrees to the scope, deliverables, timeline, investment, and terms outlined in this proposal. This agreement constitutes a binding statement of work between the client and Kreate by Design.";
  }
  return data;
};
