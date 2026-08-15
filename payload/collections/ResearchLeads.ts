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
    defaultColumns: [
      "researcherName",
      "city",
      "state",
      "estimatedService",
      "grade",
      "status",
      "createdAt",
    ],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Internal lead research submissions — Craigslist and manual opportunity tracking. " +
      "Dashboard: /admin/operations/research",
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.collection === "users") return true;
      if (user?.collection === "junior-creator-users") {
        return { juniorCreatorUser: { equals: user.id } };
      }
      return false;
    },
    create: ({ req: { user } }) => {
      if (user?.collection === "users") return true;
      if (user?.collection === "junior-creator-users") return true;
      return false;
    },
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "juniorCreatorUser",
      type: "relationship",
      relationTo: "junior-creator-users",
      label: "Junior Creator",
      admin: {
        position: "sidebar",
        description: "Set automatically when a lead is submitted from /junior-creators.",
      },
    },
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
    {
      name: "businessName",
      type: "text",
      label: "Business / Person Name",
      admin: {
        description: "Optional identity for the opportunity. Encouraged when known.",
      },
    },
    {
      name: "opportunityUrl",
      type: "text",
      label: "Opportunity URL",
      admin: {
        description: "Page where the opportunity was found (Craigslist, website, etc.).",
      },
    },
    {
      name: "contactEmail",
      type: "email",
      label: "Contact Email",
      admin: {
        description: "Contact email if provided. Never store emails in URL fields.",
      },
    },
    {
      name: "contactPhone",
      type: "text",
      label: "Phone",
    },
    {
      name: "leadUrl",
      type: "text",
      label: "Lead URL (legacy)",
      admin: {
        description:
          "Legacy single URL/contact field. Prefer opportunityUrl / contactEmail for new submissions.",
      },
    },
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
      name: "grade",
      type: "select",
      label: "Opportunity Grade",
      options: [
        { label: "A+", value: "A+" },
        { label: "A", value: "A" },
        { label: "B", value: "B" },
        { label: "C", value: "C" },
        { label: "D", value: "D" },
        { label: "F", value: "F" },
      ],
      admin: {
        description: "Human-entered opportunity quality. Optional on historical records.",
      },
    },
    {
      name: "rejectReason",
      type: "select",
      label: "Reject Reason",
      options: [
        { label: "Spam", value: "spam" },
        { label: "International", value: "international" },
        { label: "Commission-only", value: "commission-only" },
        { label: "Internship", value: "internship" },
        { label: "Barter", value: "barter" },
        { label: "Crypto", value: "crypto" },
        { label: "Recruiter", value: "recruiter" },
        { label: "Duplicate", value: "duplicate" },
        { label: "Irrelevant", value: "irrelevant" },
        { label: "Low-value", value: "low-value" },
        { label: "Other", value: "other" },
      ],
      admin: {
        description: "Required when status is Rejected. Explains why junk was skipped.",
      },
    },
    {
      name: "qualificationEvidence",
      type: "textarea",
      label: "Qualification Evidence",
      admin: {
        description:
          "Short human note on why this is or is not worth KXD time. Encouraged when reject reason is Other.",
      },
    },
    {
      name: "promotedSalesLead",
      type: "relationship",
      relationTo: "sales-leads",
      label: "Promoted Sales Opportunity",
      admin: {
        position: "sidebar",
        description: "Set when this research lead is promoted into Sales. Never deleted on promote.",
        readOnly: true,
      },
    },
    {
      name: "promotedAt",
      type: "date",
      label: "Promoted At",
      admin: {
        position: "sidebar",
        readOnly: true,
        date: { pickerAppearance: "dayAndTime" },
      },
    },
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
