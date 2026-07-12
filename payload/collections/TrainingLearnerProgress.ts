import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const TrainingLearnerProgress: CollectionConfig = {
  slug: "training-learner-progress",
  labels: { singular: "Learner Progress", plural: "Learner Progress" },
  defaultSort: "-lastViewedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "learnerKey",
    defaultColumns: ["learnerKey", "lesson", "status", "percentComplete", "lastViewedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Per-learner progress for KXD Training. Supports unlimited future team members.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "learnerKey",
      type: "text",
      required: true,
      index: true,
      label: "Learner key",
      admin: { description: "Usually the operator email." },
    },
    {
      name: "path",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "training-learning-paths" as any,
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "lesson",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "training-lessons" as any,
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "pathSlug",
      type: "text",
      label: "Path slug (denormalized)",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "lessonSlug",
      type: "text",
      label: "Lesson slug (denormalized)",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "not-started",
      options: [
        { label: "Not started", value: "not-started" },
        { label: "Started", value: "started" },
        { label: "In progress", value: "in-progress" },
        { label: "Completed", value: "completed" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "percentComplete",
      type: "number",
      required: true,
      defaultValue: 0,
      min: 0,
      max: 100,
      admin: { position: "sidebar" },
    },
    {
      name: "timeSpentSeconds",
      type: "number",
      defaultValue: 0,
      label: "Time spent (seconds)",
      admin: {
        position: "sidebar",
        description: "Future-ready; not actively accumulated in 20F.",
      },
    },
    {
      name: "startedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "lastViewedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "completedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "checklistState",
      type: "array",
      label: "Checklist completed",
      fields: [{ name: "itemId", type: "text", required: true }],
    },
  ],
};
