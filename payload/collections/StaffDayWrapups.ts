import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Optional end-of-day notes from staff for Matt.
 * Wrap-up facts are computed from Work Engine — this stores only the note/history.
 */
export const StaffDayWrapups: CollectionConfig = {
  slug: "staff-day-wrapups",
  labels: {
    singular: "Staff Day Wrap-up",
    plural: "Staff Day Wrap-ups",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "dateKey",
    defaultColumns: ["staffUser", "dateKey", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Optional end-of-day notes from staff. Does not auto-complete work.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "staffUser",
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "dateKey",
      type: "text",
      required: true,
      admin: {
        position: "sidebar",
        description: "Local calendar day YYYY-MM-DD",
      },
    },
    {
      name: "noteForMatt",
      type: "textarea",
      required: false,
      admin: { description: "Optional internal summary for Matt." },
    },
    {
      name: "snapshotJson",
      type: "textarea",
      required: false,
      admin: {
        description: "Optional JSON snapshot of wrap-up counts (audit only).",
        readOnly: true,
      },
    },
  ],
};
