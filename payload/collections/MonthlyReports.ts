import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const MonthlyReports: CollectionConfig = {
  slug: "monthly-reports",
  labels: { singular: "Monthly Report", plural: "Monthly Reports" },
  defaultSort: "-reportingYear,-reportingMonth",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "client",
      "reportingMonth",
      "reportingYear",
      "status",
      "publishedAt",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Executive monthly reports — KXD Reporting Engine. Dashboard: /admin/operations/reports",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "title",
      type: "text",
      label: "Title",
      admin: { description: "Auto-generated if empty." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      label: "Status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Generating", value: "generating" },
        { label: "Ready", value: "ready" },
        { label: "Published", value: "published" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "template",
      type: "relationship",
      relationTo: "report-templates",
      label: "Template",
      admin: { position: "sidebar" },
    },
    {
      name: "reportingMonth",
      type: "number",
      required: true,
      label: "Month",
      min: 1,
      max: 12,
      admin: { position: "sidebar" },
    },
    {
      name: "reportingYear",
      type: "number",
      required: true,
      label: "Year",
      admin: { position: "sidebar" },
    },
    {
      name: "version",
      type: "number",
      label: "Version",
      defaultValue: 1,
      admin: { position: "sidebar" },
    },
    {
      name: "preparedBy",
      type: "text",
      label: "Prepared By",
      admin: { position: "sidebar" },
    },
    {
      name: "approvedBy",
      type: "text",
      label: "Approved By",
      admin: { position: "sidebar" },
    },
    {
      name: "publishedAt",
      type: "date",
      label: "Published At",
      admin: { date: { pickerAppearance: "dayAndTime" }, position: "sidebar" },
    },
    {
      name: "viewCount",
      type: "number",
      label: "Portal Views",
      defaultValue: 0,
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Summary",
          fields: [
            { name: "executiveSummary", type: "textarea", label: "Executive Summary" },
            { name: "workCompleted", type: "textarea", label: "Work Completed" },
            { name: "notes", type: "textarea", label: "Notes" },
            { name: "nextMonthPriorities", type: "json", label: "Next Month Priorities" },
          ],
        },
        {
          label: "Delivery",
          fields: [
            { name: "deliverables", type: "json", label: "Deliverables" },
            { name: "projects", type: "json", label: "Projects" },
            { name: "meetings", type: "json", label: "Meetings" },
          ],
        },
        {
          label: "Intelligence",
          fields: [
            { name: "websiteHealth", type: "json", label: "Website Health" },
            { name: "infrastructure", type: "json", label: "Infrastructure" },
            { name: "growth", type: "json", label: "Growth" },
            { name: "recommendations", type: "json", label: "Recommendations" },
            { name: "kpis", type: "json", label: "KPIs" },
          ],
        },
        {
          label: "Analytics",
          fields: [
            { name: "traffic", type: "json", label: "Traffic" },
            { name: "conversions", type: "json", label: "Conversions" },
            { name: "seo", type: "json", label: "SEO" },
            {
              name: "connectorStatus",
              type: "json",
              label: "Connector Status",
              admin: { description: "Future: GA4, GSC, Stripe, Clarity, etc." },
            },
          ],
        },
        {
          label: "Timeline",
          fields: [
            { name: "timeline", type: "json", label: "Timeline Events" },
          ],
        },
        {
          label: "Export",
          fields: [
            { name: "reportData", type: "json", label: "Full Report Snapshot" },
            { name: "htmlExport", type: "textarea", label: "HTML Export" },
            { name: "portalHtml", type: "textarea", label: "Portal HTML" },
          ],
        },
      ],
    },
  ],
};
