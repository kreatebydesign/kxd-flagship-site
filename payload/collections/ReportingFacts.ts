/**
 * Phase 31C — Persisted Reporting Facts (Shared Core).
 * Canonical store for normalized provider facts. Portal / EP read from here only —
 * never call Google APIs from presentation compose.
 */

import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ReportingFacts: CollectionConfig = {
  slug: "reporting-facts",
  labels: { singular: "Reporting Fact", plural: "Reporting Facts" },
  defaultSort: "-periodStart",
  lockDocuments: false,
  admin: {
    useAsTitle: "factKey",
    defaultColumns: [
      "factKey",
      "client",
      "domain",
      "metricKey",
      "providerId",
      "periodStart",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Normalized reporting facts from entitled providers. Idempotent by factKey. " +
      "Never stores credentials or raw provider payloads.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "factKey",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Fact Key",
      admin: {
        description: "Deterministic id from the Reporting Engine (e.g. gsc-1-clicks-2026-06-01).",
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
      name: "periodStart",
      type: "text",
      required: true,
      index: true,
      label: "Period Start (ISO)",
    },
    {
      name: "periodEnd",
      type: "text",
      required: true,
      label: "Period End (ISO)",
    },
    {
      name: "periodGrain",
      type: "select",
      required: true,
      defaultValue: "month",
      options: [
        { label: "Day", value: "day" },
        { label: "Week", value: "week" },
        { label: "Month", value: "month" },
      ],
    },
    {
      name: "periodLabel",
      type: "text",
      label: "Period Label",
    },
    {
      name: "domain",
      type: "text",
      required: true,
      index: true,
      label: "Business Domain",
    },
    {
      name: "metricKey",
      type: "text",
      required: true,
      index: true,
      label: "Canonical Metric Key",
    },
    {
      name: "providerId",
      type: "text",
      required: true,
      index: true,
      label: "Source Provider Id",
      admin: {
        description: "Provenance only (e.g. google-search-console). Never brand-led UI authority.",
      },
    },
    {
      name: "value",
      type: "number",
      required: true,
      label: "Value",
    },
    {
      name: "unit",
      type: "text",
      required: true,
      label: "Unit",
    },
    {
      name: "previousValue",
      type: "number",
      label: "Previous Value",
    },
    {
      name: "delta",
      type: "number",
      label: "Delta",
    },
    {
      name: "trend",
      type: "select",
      options: [
        { label: "Up", value: "up" },
        { label: "Down", value: "down" },
        { label: "Flat", value: "flat" },
        { label: "Unknown", value: "unknown" },
      ],
    },
    {
      name: "sourceFetchedAt",
      type: "text",
      required: true,
      label: "Source Fetched At",
    },
    {
      name: "sourceFreshness",
      type: "select",
      required: true,
      options: [
        { label: "Fresh", value: "fresh" },
        { label: "Stale", value: "stale" },
        { label: "Missing", value: "missing" },
      ],
    },
    {
      name: "sourceConfidence",
      type: "select",
      required: true,
      options: [
        { label: "High", value: "high" },
        { label: "Medium", value: "medium" },
        { label: "Low", value: "low" },
        { label: "Unknown", value: "unknown" },
      ],
    },
    {
      name: "evidenceRefs",
      type: "json",
      label: "Evidence Refs",
    },
  ],
};
