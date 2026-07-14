/**
 * Phase 34A — Durable Client Launch Wizard drafts.
 * Admin-only. Draft navigation never activates a client workspace.
 */

import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ClientLaunchDrafts: CollectionConfig = {
  slug: "client-launch-drafts",
  labels: {
    singular: "Client Launch Draft",
    plural: "Client Launch Drafts",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "businessName",
    defaultColumns: [
      "businessName",
      "clientSlug",
      "status",
      "currentStep",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Phase 34A launch wizard drafts. Saved/resume state only — no client activation until Launch.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "businessName",
      type: "text",
      label: "Business Name",
      index: true,
      admin: {
        description: "Denormalized for admin list views.",
      },
    },
    {
      name: "clientSlug",
      type: "text",
      label: "ClientSlug",
      index: true,
      admin: {
        description: "Denormalized draft slug for uniqueness checks.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      index: true,
      options: [
        { label: "Draft", value: "draft" },
        { label: "Ready", value: "ready" },
        { label: "Launching", value: "launching" },
        { label: "Launched", value: "launched" },
        { label: "Failed", value: "failed" },
        { label: "Abandoned", value: "abandoned" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "currentStep",
      type: "select",
      required: true,
      defaultValue: "identity",
      options: [
        { label: "Identity", value: "identity" },
        { label: "Package", value: "package" },
        { label: "Experience", value: "experience" },
        { label: "Modules", value: "modules" },
        { label: "Infrastructure", value: "infrastructure" },
        { label: "Team", value: "team" },
        { label: "Automation", value: "automation" },
        { label: "Review", value: "review" },
        { label: "Launch", value: "launch" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "payload",
      type: "json",
      required: true,
      label: "Draft Payload",
      admin: {
        description:
          "Structured launch draft. Never store secrets, tokens, or OAuth credentials.",
      },
    },
    {
      name: "validationIssues",
      type: "json",
      label: "Validation Issues",
    },
    {
      name: "launchOperationId",
      type: "text",
      unique: true,
      index: true,
      label: "Launch Operation ID",
      admin: {
        description: "Idempotency key for double-submit protection.",
        position: "sidebar",
      },
    },
    {
      name: "launchedClient",
      type: "relationship",
      relationTo: "clients",
      label: "Launched Client",
      admin: { position: "sidebar" },
    },
    {
      name: "failureSummary",
      type: "textarea",
      label: "Failure Summary",
      admin: {
        description: "Sanitized failure details for safe retry.",
      },
    },
    {
      name: "createdBy",
      type: "text",
      label: "Created By",
      admin: { position: "sidebar" },
    },
  ],
};
