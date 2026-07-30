/**
 * payload/collections/WebsiteAudits.ts
 * KXD OS Phase 6A — Website Auditor lead records
 * Extended: internal Website Audit Report Generator (curated client deliverable).
 */

import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const WebsiteAudits: CollectionConfig = {
  slug: "website-audits",
  labels: { singular: "Website Audit", plural: "Website Audits" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "company",
    defaultColumns: [
      "company",
      "website",
      "overallScore",
      "status",
      "reportStatus",
      "createdAt",
    ],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Website Auditor leads — public audit submissions with scores and recommendations. " +
      "Client-ready reports: /admin/operations/audits · Report editor: /admin/operations/audits/{id}/report",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Lead",
          fields: [
            { name: "name", type: "text", required: true, label: "Name" },
            { name: "email", type: "email", required: true, label: "Email" },
            { name: "company", type: "text", label: "Company" },
            { name: "website", type: "text", required: true, label: "Website URL" },
            {
              name: "client",
              type: "relationship",
              relationTo: "clients",
              label: "Linked Client",
              admin: {
                description:
                  "Optional. Existing KXD client relationship. Canonical website is resolved server-side.",
              },
            },
            {
              name: "canonicalWebsiteUrl",
              type: "text",
              label: "Canonical Client Website",
              admin: {
                description:
                  "Trusted client website from the client record (may differ from audited URL).",
                readOnly: true,
              },
            },
            {
              name: "internalNotes",
              type: "textarea",
              label: "Internal Notes",
              admin: {
                description: "Operator-only. Never included in preview or PDF.",
              },
            },
          ],
        },
        {
          label: "Scores",
          fields: [
            { name: "overallScore", type: "number", label: "Overall Score", min: 0, max: 100 },
            { name: "grade", type: "text", label: "KXD Grade", admin: { description: "A · B · C · D · F" } },
            { name: "performanceScore", type: "number", label: "Performance", min: 0, max: 100 },
            { name: "seoScore", type: "number", label: "SEO", min: 0, max: 100 },
            { name: "mobileScore", type: "number", label: "Mobile Experience", min: 0, max: 100 },
            { name: "conversionScore", type: "number", label: "Conversion", min: 0, max: 100 },
            { name: "brandScore", type: "number", label: "Brand", min: 0, max: 100 },
          ],
        },
        {
          label: "Recommendations",
          fields: [
            {
              name: "strengths",
              type: "textarea",
              label: "Strengths",
              admin: { description: "One strength per line. Raw auditor evidence — do not edit for report tone." },
            },
            {
              name: "opportunities",
              type: "textarea",
              label: "Improvement Opportunities",
              admin: { description: "One opportunity per line. Raw auditor evidence." },
            },
            {
              name: "recommendations",
              type: "textarea",
              label: "KXD Recommendations",
              admin: { description: "One recommendation per line. Raw auditor evidence." },
            },
          ],
        },
        {
          label: "Report",
          fields: [
            {
              name: "reportStatus",
              type: "select",
              required: true,
              defaultValue: "none",
              options: [
                { label: "Not generated", value: "none" },
                { label: "Draft", value: "draft" },
                { label: "Ready for review", value: "ready-for-review" },
                { label: "Approved", value: "approved" },
                { label: "Archived", value: "archived" },
              ],
              admin: {
                description:
                  "Client-report lifecycle (separate from lead pipeline status). Prefer the operations report editor.",
              },
            },
            {
              name: "reportTitle",
              type: "text",
              label: "Report Title",
            },
            {
              name: "executiveSummary",
              type: "textarea",
              label: "Executive Summary",
            },
            {
              name: "workingWell",
              type: "textarea",
              label: "What Is Working Well",
            },
            {
              name: "losingOpportunity",
              type: "textarea",
              label: "Where the Website Is Losing Opportunity",
            },
            {
              name: "recommendedNextSteps",
              type: "textarea",
              label: "Recommended Next Steps",
            },
            {
              name: "closingNote",
              type: "textarea",
              label: "Closing Note",
            },
            {
              name: "sectionVisibility",
              type: "json",
              label: "Section Visibility",
              admin: {
                description: "Managed by the report editor.",
              },
            },
            {
              name: "findingOverrides",
              type: "json",
              label: "Finding Presentation Overrides",
              admin: {
                description: "Hide/edit client-facing finding language without changing raw evidence.",
              },
            },
            {
              name: "manualFindings",
              type: "json",
              label: "Manual Findings",
              admin: {
                description: "Operator-added findings with clear provenance.",
              },
            },
            {
              name: "recommendationPlan",
              type: "json",
              label: "Priority Action Plan",
              admin: {
                description: "Ordered, grouped recommendations for the client report.",
              },
            },
            {
              name: "approvedSnapshot",
              type: "json",
              label: "Approved Report Snapshot",
              admin: {
                description: "Immutable client-facing snapshot captured at approval.",
                readOnly: true,
              },
            },
            {
              name: "reportGeneratedAt",
              type: "date",
              label: "Report Generated At",
              admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
            },
            {
              name: "reportUpdatedAt",
              type: "date",
              label: "Report Updated At",
              admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
            },
            {
              name: "reportApprovedAt",
              type: "date",
              label: "Report Approved At",
              admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
            },
            {
              name: "reportApprovedBy",
              type: "text",
              label: "Report Approved By",
              admin: { readOnly: true },
            },
            {
              name: "reportDownloadedAt",
              type: "date",
              label: "Report Downloaded At",
              admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true },
            },
            {
              name: "reportDownloadedBy",
              type: "text",
              label: "Report Downloaded By",
              admin: { readOnly: true },
            },
          ],
        },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new-lead",
      options: [
        { label: "New Lead", value: "new-lead" },
        { label: "Contacted", value: "contacted" },
        { label: "Qualified", value: "qualified" },
        { label: "Proposal Sent", value: "proposal-sent" },
        { label: "Closed Won", value: "closed-won" },
        { label: "Closed Lost", value: "closed-lost" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "completedAt",
      type: "date",
      label: "Completed At",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
  ],
};
