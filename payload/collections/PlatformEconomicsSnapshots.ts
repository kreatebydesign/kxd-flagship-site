import type { CollectionConfig } from "payload";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { isFounderStudioOperator } from "../access/founder-studio-operator.ts";

export const PlatformEconomicsSnapshots: CollectionConfig = {
  slug: "platform-economics-snapshots",
  labels: {
    singular: "Platform Economics Snapshot",
    plural: "Platform Economics Snapshots",
  },
  defaultSort: "-capturedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "calculationVersion", "capturedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Founder-only dated valuation and scenario snapshots for KXD OS Platform Economics.",
    hidden: ({ user }) => !isFounderStudioOperator(user),
  },
  access: {
    read: ({ req: { user } }) => isFounderStudioOperator(user),
    create: ({ req: { user } }) => isFounderStudioOperator(user),
    update: () => false,
    delete: ({ req: { user } }) => isFounderStudioOperator(user),
  },
  fields: [
    {
      name: "label",
      type: "text",
      required: true,
      admin: { description: "Human-readable snapshot title (e.g. October 2026 baseline)." },
    },
    {
      name: "calculationVersion",
      type: "text",
      required: true,
      defaultValue: "v1",
      admin: { position: "sidebar" },
    },
    {
      name: "capturedAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "sourceFingerprint",
      type: "text",
      required: true,
      admin: {
        description: "Hash of registry completion + health inputs used for this snapshot.",
      },
    },
    {
      name: "inputs",
      type: "json",
      required: true,
      label: "Scenario inputs",
    },
    {
      name: "outputs",
      type: "json",
      required: true,
      label: "Computed outputs",
    },
    {
      name: "milestoneNotes",
      type: "json",
      required: true,
      label: "Milestone attribution",
      admin: {
        description: "Verified development milestones referenced in this snapshot.",
      },
    },
  ],
};
