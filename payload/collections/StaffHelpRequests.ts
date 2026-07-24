import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

/**
 * Internal staff → Matt help requests.
 * Not a messaging platform — short blocker questions only. No external notifications.
 */
export const StaffHelpRequests: CollectionConfig = {
  slug: "staff-help-requests",
  labels: {
    singular: "Staff Help Request",
    plural: "Staff Help Requests",
  },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "question",
    defaultColumns: ["staffUser", "status", "work", "createdAt", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Internal Ask Matt for help. Workspace: /admin/operations/staff/oversight",
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
      name: "work",
      type: "relationship",
      relationTo: "work",
      required: false,
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: false,
      admin: { position: "sidebar" },
    },
    {
      name: "question",
      type: "textarea",
      required: true,
      admin: { description: "Short question or blocker — facts only." },
    },
    {
      name: "pagePath",
      type: "text",
      required: true,
      admin: { position: "sidebar", description: "Page/context where help was requested." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "open",
      options: [
        { label: "Open", value: "open" },
        { label: "Answered", value: "answered" },
        { label: "Resolved", value: "resolved" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "mattResponse",
      type: "textarea",
      required: false,
      admin: { description: "Matt's response — visible to the requesting staff member." },
    },
    {
      name: "intelligenceResponse",
      type: "textarea",
      required: false,
      admin: {
        description: "KXD Intelligence response — never labeled as Matt.",
      },
    },
    {
      name: "responseSource",
      type: "select",
      defaultValue: "none",
      options: [
        { label: "None", value: "none" },
        { label: "Deterministic", value: "deterministic" },
        { label: "AI-assisted", value: "ai-assisted" },
        { label: "Matt", value: "matt" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "confidence",
      type: "select",
      required: false,
      options: [
        { label: "High", value: "high" },
        { label: "Medium", value: "medium" },
        { label: "Low", value: "low" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "requiresMatt",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "When true, remains in Matt's help queue even if Intelligence replied.",
      },
    },
    {
      name: "intelligenceRespondedAt",
      type: "date",
      required: false,
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "mattRespondedAt",
      type: "date",
      required: false,
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "answeredAt",
      type: "date",
      required: false,
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "resolvedAt",
      type: "date",
      required: false,
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
  ],
};
