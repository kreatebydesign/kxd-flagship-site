import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const TrainingLearningPaths: CollectionConfig = {
  slug: "training-learning-paths",
  labels: { singular: "Learning Path", plural: "Learning Paths" },
  defaultSort: "sortOrder",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "sortOrder", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "KXD Training & Enablement learning paths. Workspace: /admin/training",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: "title", type: "text", required: true, label: "Title" },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      label: "Slug",
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "sortOrder",
      type: "number",
      required: true,
      defaultValue: 100,
      admin: { position: "sidebar" },
    },
    {
      name: "estimatedMinutes",
      type: "number",
      label: "Estimated minutes",
      admin: { position: "sidebar" },
    },
    { name: "summary", type: "textarea", label: "Summary" },
    { name: "description", type: "textarea", label: "Description" },
    { name: "audience", type: "text", label: "Audience" },
  ],
};
