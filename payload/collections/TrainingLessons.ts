import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const TrainingLessons: CollectionConfig = {
  slug: "training-lessons",
  labels: { singular: "Training Lesson", plural: "Training Lessons" },
  defaultSort: "sortOrder",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "path", "status", "estimatedMinutes", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Lessons inside KXD Learning Paths. Workspace: /admin/training",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "path",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "training-learning-paths" as any,
      required: true,
      label: "Learning Path",
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
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
      defaultValue: 10,
      admin: { position: "sidebar" },
    },
    {
      name: "practiceWorkKey",
      type: "text",
      label: "Practice work key",
      admin: {
        position: "sidebar",
        description: "Future Work Engine spawn key (do not automate yet).",
      },
    },
    {
      name: "workStage",
      type: "select",
      defaultValue: "learn",
      options: [
        { label: "Learn", value: "learn" },
        { label: "Practice", value: "practice" },
        { label: "Review", value: "review" },
        { label: "Approved", value: "approved" },
        { label: "Independent", value: "independent" },
      ],
      admin: { position: "sidebar" },
    },
    { name: "summary", type: "textarea" },
    { name: "objective", type: "textarea", label: "Learning objective" },
    { name: "body", type: "textarea", label: "Lesson content" },
    {
      name: "steps",
      type: "array",
      label: "Step-by-step procedures",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "detail", type: "textarea", required: true },
      ],
    },
    {
      name: "examples",
      type: "array",
      label: "Real KXD examples",
      fields: [{ name: "text", type: "textarea", required: true }],
    },
    {
      name: "commonMistakes",
      type: "array",
      label: "Common mistakes",
      fields: [{ name: "text", type: "textarea", required: true }],
    },
    {
      name: "bestPractices",
      type: "array",
      label: "Best practices",
      fields: [{ name: "text", type: "textarea", required: true }],
    },
    {
      name: "checklist",
      type: "array",
      label: "Completion checklist",
      fields: [
        { name: "itemId", type: "text", required: true, label: "Item ID" },
        { name: "label", type: "text", required: true },
        { name: "required", type: "checkbox", defaultValue: true },
      ],
    },
    {
      name: "resources",
      type: "array",
      label: "Resources",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text" },
        { name: "note", type: "text" },
      ],
    },
    {
      name: "images",
      type: "array",
      label: "Images",
      fields: [
        { name: "url", type: "text", required: true },
        { name: "alt", type: "text", required: true },
        { name: "caption", type: "text" },
      ],
    },
    {
      name: "knowledgeCheckPlaceholder",
      type: "textarea",
      label: "Knowledge check (placeholder)",
    },
    {
      name: "practiceTaskPlaceholder",
      type: "textarea",
      label: "Practice task (placeholder)",
    },
    {
      name: "operationsFrame",
      type: "json",
      label: "Operations frame (20G)",
      admin: {
        description:
          "OS vs responsibility, Intelligence asks, escalation, walkthrough, practice specs.",
      },
    },
  ],
};
