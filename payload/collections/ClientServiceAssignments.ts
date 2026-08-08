import type { CollectionConfig } from "payload";
import { isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { SERVICE_CAPABILITY_CATALOG } from "../../lib/service-capabilities/catalog.ts";

export const ClientServiceAssignments: CollectionConfig = {
  slug: "client-service-assignments",
  labels: {
    singular: "Client service assignment",
    plural: "Client service assignments",
  },
  defaultSort: "-effectiveAt",
  lockDocuments: false,
  timestamps: true,
  admin: {
    useAsTitle: "capabilityId",
    defaultColumns: ["client", "capabilityId", "source", "status", "effectiveAt", "endedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Structured commercial service scope per client. createdAt/updatedAt are automatic. End assignments instead of deleting them.",
  },
  access: {
    read: isPayloadAdminUser,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: () => false,
  },
  hooks: {
    beforeDelete: [
      () => {
        throw new Error("Service assignments are historical. End them instead of deleting.");
      },
    ],
    beforeChange: [
      ({ originalDoc, data, operation }) => {
        if (operation === "update" && originalDoc) {
          const previousStatus = String(originalDoc.status ?? "");
          const nextStatus = String(data.status ?? originalDoc.status ?? "");
          const wasTerminal = previousStatus === "ended" || previousStatus === "expired";
          if (wasTerminal && nextStatus === "active") {
            throw new Error(
              "Ended assignments stay historical. Create a new active assignment to restore a service.",
            );
          }
          if (
            (nextStatus === "ended" || nextStatus === "expired") &&
            !data.endedAt &&
            !originalDoc.endedAt
          ) {
            data.endedAt = new Date().toISOString();
          }
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      index: true,
      label: "Client",
    },
    {
      name: "capabilityId",
      type: "select",
      required: true,
      index: true,
      label: "Service capability",
      options: SERVICE_CAPABILITY_CATALOG.map((entry) => ({
        label: entry.label,
        value: entry.id,
      })),
    },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "legacy-manual",
      options: [
        { label: "Agreement", value: "agreement" },
        { label: "Legacy manual", value: "legacy-manual" },
        { label: "Included", value: "included" },
        { label: "Add-on", value: "add-on" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      index: true,
      options: [
        { label: "Active", value: "active" },
        { label: "Ended", value: "ended" },
        { label: "Expired", value: "expired" },
      ],
    },
    {
      name: "effectiveAt",
      type: "date",
      label: "Effective at",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "endedAt",
      type: "date",
      label: "Ended at",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "relatedContract",
      type: "relationship",
      relationTo: "contracts",
      label: "Related contract",
      admin: {
        description:
          "Optional immutable reference to an existing contract/direct agreement. Does not copy or mutate agreement terms. Required later for agreement-backed rows when a contract exists; omit for legacy/manual.",
      },
    },
    {
      name: "note",
      type: "textarea",
      label: "Internal note",
      admin: {
        description:
          "Operator evidence only. Do not paste agreement prose or performance-compensation amounts as capability grants.",
      },
    },
  ],
};
