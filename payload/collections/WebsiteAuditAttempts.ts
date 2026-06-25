/**
 * Internal rate-limit log for public website audits (IP + timestamp).
 * Not exposed in admin — records only, no PII.
 */
import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";

export const WebsiteAuditAttempts: CollectionConfig = {
  slug: "website-audit-attempts",
  labels: { singular: "Audit Attempt", plural: "Audit Attempts" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    hidden: true,
    group: "System",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: () => false,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "ip",
      type: "text",
      required: true,
      index: true,
      label: "Client IP",
    },
  ],
};
