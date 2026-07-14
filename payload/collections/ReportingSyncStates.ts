/**
 * Phase 33A / 33A.1 — Per-(client, provider) automated reporting sync health.
 * Unique per client+provider. Holds schedule, lease, and window idempotency state.
 */

import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ReportingSyncStates: CollectionConfig = {
  slug: "reporting-sync-states",
  labels: {
    singular: "Reporting Sync State",
    plural: "Reporting Sync States",
  },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "stateKey",
    defaultColumns: [
      "stateKey",
      "client",
      "provider",
      "integrationStatus",
      "lastOutcome",
      "nextScheduledSyncAt",
      "executionStatus",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Automated reporting sync health per client + provider. " +
      "No credentials. No fabricated Connected states.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "stateKey",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "State Key",
      admin: {
        description: "Deterministic `{clientId}:{provider}`.",
      },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      index: true,
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "provider",
      type: "select",
      required: true,
      index: true,
      label: "Provider",
      options: [
        { label: "Search Console", value: "search-console" },
        { label: "GA4", value: "ga4" },
        { label: "Google Ads", value: "ads" },
      ],
    },
    {
      name: "automationEnabled",
      type: "checkbox",
      label: "Automation Enabled",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "integrationStatus",
      type: "select",
      label: "Integration Status",
      defaultValue: "idle",
      options: [
        { label: "Healthy", value: "healthy" },
        { label: "Not Entitled", value: "not-entitled" },
        { label: "Automation Disabled", value: "automation-disabled" },
        { label: "Not Configured", value: "not-configured" },
        { label: "Auth Unavailable", value: "auth-unavailable" },
        { label: "Awaiting Client", value: "awaiting-client" },
        { label: "Temporarily Failing", value: "temporarily-failing" },
        { label: "Idle", value: "idle" },
        { label: "Running", value: "running" },
      ],
    },
    {
      name: "lastSuccessfulSyncAt",
      type: "date",
      label: "Last Successful Sync",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "lastFailedSyncAt",
      type: "date",
      label: "Last Failed Sync",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "failureReason",
      type: "textarea",
      label: "Failure Reason",
      admin: {
        description: "Sanitized failure text only — never tokens or secrets.",
      },
    },
    {
      name: "consecutiveFailures",
      type: "number",
      label: "Consecutive Failures",
      defaultValue: 0,
      min: 0,
    },
    {
      name: "nextScheduledSyncAt",
      type: "date",
      label: "Next Scheduled Sync",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "lastCompletedWindowId",
      type: "text",
      label: "Last Completed Window ID",
      index: true,
      admin: {
        description: "Idempotency key: client:provider:windowInstant.",
      },
    },
    {
      name: "lastOutcome",
      type: "select",
      label: "Last Outcome",
      options: [
        { label: "Synced", value: "synced" },
        { label: "Synced Empty", value: "synced-empty" },
        { label: "Skipped Not Entitled", value: "skipped-not-entitled" },
        { label: "Skipped Automation Disabled", value: "skipped-automation-disabled" },
        { label: "Skipped Not Configured", value: "skipped-not-configured" },
        { label: "Skipped Auth Unavailable", value: "skipped-auth-unavailable" },
        { label: "Skipped Awaiting Client", value: "skipped-awaiting-client" },
        { label: "Skipped Window Complete", value: "skipped-window-complete" },
        { label: "Lease Held", value: "lease-held" },
        { label: "Unavailable", value: "unavailable" },
        { label: "Unauthorized", value: "unauthorized" },
        { label: "Forbidden", value: "forbidden" },
        { label: "Invalid", value: "invalid" },
        { label: "Timeout", value: "timeout" },
        { label: "Error", value: "error" },
        { label: "Deferred", value: "deferred" },
        { label: "Planned", value: "planned" },
      ],
    },
    {
      name: "lastFactsWritten",
      type: "number",
      label: "Last Facts Written",
      defaultValue: 0,
      min: 0,
    },
    {
      name: "executionStatus",
      type: "select",
      label: "Execution Status",
      defaultValue: "idle",
      options: [
        { label: "Idle", value: "idle" },
        { label: "Running", value: "running" },
      ],
    },
    {
      name: "executionRunId",
      type: "text",
      label: "Execution Run ID",
    },
    {
      name: "executionStartedAt",
      type: "date",
      label: "Execution Started",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "leaseExpiresAt",
      type: "date",
      label: "Lease Expires",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
