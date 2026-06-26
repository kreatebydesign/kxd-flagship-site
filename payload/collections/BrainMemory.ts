import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const BrainMemory: CollectionConfig = {
  slug: "brain-memory",
  labels: { singular: "Brain Memory Event", plural: "Brain Memory" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "recommendationId",
    defaultColumns: ["recommendationId", "action", "client", "title", "createdAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "KXD Brain memory — tracks shown, dismissed, completed, and ignored recommendations.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "recommendationId",
      type: "text",
      required: true,
      label: "Recommendation ID",
    },
    {
      name: "action",
      type: "select",
      required: true,
      label: "Action",
      options: [
        { label: "Shown", value: "shown" },
        { label: "Dismissed", value: "dismissed" },
        { label: "Completed", value: "completed" },
        { label: "Ignored", value: "ignored" },
      ],
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "title",
      type: "text",
      label: "Title Snapshot",
      admin: { description: "Recommendation title at time of action." },
    },
  ],
};
