/**
 * payload/collections/WebsiteAudits.ts
 * KXD OS Phase 6A — Website Auditor lead records
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
    defaultColumns: ["company", "website", "overallScore", "status", "createdAt"],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Website Auditor leads — public audit submissions with scores and recommendations. " +
      "Dashboard: /admin/operations/audits",
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
              admin: { description: "One strength per line." },
            },
            {
              name: "opportunities",
              type: "textarea",
              label: "Improvement Opportunities",
              admin: { description: "One opportunity per line." },
            },
            {
              name: "recommendations",
              type: "textarea",
              label: "KXD Recommendations",
              admin: { description: "One recommendation per line." },
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
