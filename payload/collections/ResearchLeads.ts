/**
 * payload/collections/ResearchLeads.ts
 * KXD OS — Lead Research Desk (Craigslist / manual research intake)
 */

import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ResearchLeads: CollectionConfig = {
  slug: "research-leads",
  labels: { singular: "Research Lead", plural: "Research Leads" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "researcherName",
    defaultColumns: ["researcherName", "city", "state", "estimatedService", "status", "createdAt"],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Internal lead research submissions — Craigslist and manual opportunity tracking. " +
      "Dashboard: /admin/operations/research",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: "researcherName", type: "text", required: true, label: "Researcher" },
    {
      name: "source",
      type: "text",
      label: "Source",
      defaultValue: "Craigslist",
      admin: { description: "Lead source (e.g. Craigslist, referral)." },
    },
    { name: "state", type: "text", label: "State" },
    { name: "city", type: "text", label: "City" },
    { name: "leadUrl", type: "text", label: "Lead URL" },
    { name: "category", type: "text", label: "Category" },
    {
      name: "estimatedService",
      type: "select",
      label: "Estimated Service",
      options: [
        { label: "Website", value: "website" },
        { label: "Branding", value: "branding" },
        { label: "SEO", value: "seo" },
        { label: "Marketing", value: "marketing" },
        { label: "CRM", value: "crm" },
        { label: "Automation", value: "automation" },
        { label: "Other", value: "other" },
      ],
    },
    { name: "notes", type: "textarea", label: "Notes" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "Reviewing", value: "reviewing" },
        { label: "Qualified", value: "qualified" },
        { label: "Rejected", value: "rejected" },
        { label: "Contacted", value: "contacted" },
        { label: "Closed Won", value: "closed-won" },
        { label: "Closed Lost", value: "closed-lost" },
      ],
      admin: { position: "sidebar" },
    },
  ],
};
