/**
 * payload/collections/JuniorCreatorTasks.ts
 * KXD OS — Assigned client/internal work for Junior Creators (separate from Academy).
 */

import type { CollectionConfig } from "payload";
import {
  isPayloadAdminUser,
  isStudioPayloadOperator,
} from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const JUNIOR_TASK_STATUSES = [
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Ready for Review", value: "ready_for_review" },
  { label: "Completed", value: "completed" },
  { label: "Blocked", value: "blocked" },
  { label: "Cancelled", value: "cancelled" },
] as const;

export const JUNIOR_TASK_PRIORITIES = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
] as const;

export const JuniorCreatorTasks: CollectionConfig = {
  slug: "junior-creator-tasks",
  labels: {
    singular: "Junior Creator Task",
    plural: "Junior Creator Tasks",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "juniorCreatorUser",
      "clientLabel",
      "priority",
      "status",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Assigned client or Internal KXD work for Junior Creators. " +
      "Separate from Junior Academy training missions.",
  },
  access: {
    admin: ({ req: { user } }) => isStudioPayloadOperator(user),
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.collection === "junior-creator-users") {
        // Own tasks only. Archived/cancelled filtered in app loaders/APIs.
        return { juniorCreatorUser: { equals: user.id } };
      }
      return isStudioPayloadOperator(user);
    },
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      label: "Title",
    },
    {
      name: "instructions",
      type: "textarea",
      required: true,
      label: "Instructions",
      admin: {
        description: "Clear step-by-step instructions for the Junior Creator.",
      },
    },
    {
      name: "clientLabel",
      type: "text",
      required: true,
      label: "Client or Internal KXD",
      admin: {
        description: 'e.g. "On-Track Performance" or "Internal KXD".',
      },
    },
    {
      name: "juniorCreatorUser",
      type: "relationship",
      relationTo: "junior-creator-users",
      required: true,
      label: "Assigned Junior Creator",
      admin: { position: "sidebar" },
    },
    {
      name: "priority",
      type: "select",
      required: true,
      defaultValue: "medium",
      options: [...JUNIOR_TASK_PRIORITIES],
      admin: { position: "sidebar" },
    },
    {
      name: "estimatedMinutes",
      type: "number",
      required: true,
      min: 1,
      label: "Estimated Time (minutes)",
      admin: { position: "sidebar" },
    },
    {
      name: "dueAt",
      type: "date",
      label: "Due Date",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly" },
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "assigned",
      options: [...JUNIOR_TASK_STATUSES],
      admin: { position: "sidebar" },
    },
    {
      name: "completionNotes",
      type: "textarea",
      label: "Completion Notes",
      admin: {
        description: "Junior notes, inventory locations, questions for Matt.",
      },
    },
    {
      name: "relatedLink",
      type: "text",
      label: "Related Folder or Link",
      admin: {
        description: "Optional shared folder path or URL (never passwords).",
      },
    },
    {
      name: "seedKey",
      type: "text",
      unique: true,
      index: true,
      label: "Seed Key",
      admin: {
        position: "sidebar",
        description:
          "Idempotent seed identifier. Leave empty for manually created tasks.",
      },
    },
    {
      name: "archived",
      type: "checkbox",
      label: "Archived",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Archived tasks are hidden from the Junior dashboard.",
      },
    },
  ],
};
