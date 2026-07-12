import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Per-operator read markers for the Executive Activity Center.
 * Does not store events — events live on executive-timeline-events.
 */
export const ExecutiveActivityReads: CollectionConfig = {
  slug: "executive-activity-reads",
  labels: {
    singular: "Activity Read Marker",
    plural: "Activity Read Markers",
  },
  defaultSort: "-readAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "readerKey",
    defaultColumns: ["readerKey", "event", "readAt", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Internal read state for the Executive Activity Center. Events remain on the executive timeline.",
    hidden: true,
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "event",
      type: "relationship",
      relationTo: "executive-timeline-events",
      required: true,
      label: "Timeline Event",
      index: true,
    },
    {
      name: "readerKey",
      type: "text",
      required: true,
      label: "Reader Key",
      index: true,
      admin: {
        description: "Operator email or studio key.",
      },
    },
    {
      name: "readAt",
      type: "date",
      required: true,
      label: "Read At",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
      },
    },
  ],
};
