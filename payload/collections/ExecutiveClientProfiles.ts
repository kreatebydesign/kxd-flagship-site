import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { applyExecutiveAnnualValue } from "../hooks/executive-client-profile.ts";

const potentialOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export const ExecutiveClientProfiles: CollectionConfig = {
  slug: "executive-client-profiles",
  labels: { singular: "Executive Client Profile", plural: "Executive Client Profiles" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "profileTitle",
    defaultColumns: [
      "client",
      "clientTier",
      "relationshipStatus",
      "currentMonthlyRevenue",
      "internalPriority",
      "clientHealthScore",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Executive-level account intelligence linked to Clients. " +
      "Dashboard: /admin/operations/clients",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    beforeChange: [applyExecutiveAnnualValue],
  },
  fields: [
    {
      name: "profileTitle",
      type: "text",
      label: "Profile Title",
      admin: {
        description: "Auto-filled from client name when linked.",
        readOnly: true,
      },
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      unique: true,
      label: "Client",
      admin: {
        position: "sidebar",
        description: "One executive profile per client.",
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Executive",
          fields: [
            {
              name: "executiveSummary",
              type: "textarea",
              label: "Executive Summary",
            },
            {
              type: "row",
              fields: [
                {
                  name: "clientTier",
                  type: "select",
                  label: "Client Tier",
                  options: [
                    { label: "Tier A", value: "A" },
                    { label: "Tier B", value: "B" },
                    { label: "Tier C", value: "C" },
                  ],
                },
                {
                  name: "clientHealthScore",
                  type: "number",
                  label: "Health Score",
                  min: 0,
                  max: 100,
                  admin: { description: "0–100 executive health score." },
                },
                {
                  name: "relationshipStatus",
                  type: "select",
                  label: "Relationship Status",
                  defaultValue: "active",
                  options: [
                    { label: "Active", value: "active" },
                    { label: "Paused", value: "paused" },
                    { label: "At Risk", value: "at-risk" },
                    { label: "Archived", value: "archived" },
                  ],
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "currentMonthlyRevenue",
                  type: "number",
                  label: "Current Monthly Revenue ($)",
                },
                {
                  name: "estimatedAnnualValue",
                  type: "number",
                  label: "Estimated Annual Value ($)",
                  admin: {
                    description: "Manual override. Auto-calculated from monthly revenue × 12 when empty.",
                  },
                },
                {
                  name: "potentialMonthlyRevenue",
                  type: "number",
                  label: "Potential Monthly Revenue ($)",
                },
              ],
            },
            {
              name: "primaryDecisionMaker",
              type: "text",
              label: "Primary Decision Maker",
            },
            {
              name: "secondaryContacts",
              type: "array",
              label: "Secondary Contacts",
              fields: [
                { name: "name", type: "text", label: "Name" },
                { name: "role", type: "text", label: "Role" },
                { name: "email", type: "email", label: "Email" },
              ],
            },
            {
              name: "currentServices",
              type: "textarea",
              label: "Current Services",
              admin: { description: "Active services and scope items." },
            },
            {
              name: "activeProjectsSummary",
              type: "textarea",
              label: "Active Projects Summary",
            },
            {
              name: "strategicNotes",
              type: "textarea",
              label: "Strategic Notes",
            },
            {
              name: "growthOpportunities",
              type: "textarea",
              label: "Growth Opportunities",
            },
            {
              name: "upsellOpportunities",
              type: "textarea",
              label: "Upsell Opportunities",
            },
            {
              name: "riskNotes",
              type: "textarea",
              label: "Risk Notes",
            },
            {
              type: "row",
              fields: [
                {
                  name: "nextAction",
                  type: "text",
                  label: "Next Action",
                },
                {
                  name: "nextActionDueDate",
                  type: "date",
                  label: "Next Action Due Date",
                  admin: { date: { pickerAppearance: "dayOnly" } },
                },
              ],
            },
          ],
        },
        {
          label: "Potential & Priority",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "caseStudyPotential",
                  type: "select",
                  label: "Case Study Potential",
                  options: [
                    { label: "Low", value: "low" },
                    { label: "Medium", value: "medium" },
                    { label: "High", value: "high" },
                    { label: "Flagship", value: "flagship" },
                  ],
                },
                {
                  name: "referralPotential",
                  type: "select",
                  label: "Referral Potential",
                  options: potentialOptions,
                },
                {
                  name: "productizationPotential",
                  type: "select",
                  label: "Productization Potential",
                  options: potentialOptions,
                },
                {
                  name: "internalPriority",
                  type: "select",
                  label: "Internal Priority",
                  options: [
                    { label: "Low", value: "low" },
                    { label: "Medium", value: "medium" },
                    { label: "High", value: "high" },
                    { label: "Critical", value: "critical" },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Technical Stack",
          fields: [
            {
              type: "row",
              fields: [
                { name: "productionUrl", type: "text", label: "Production URL" },
                { name: "stagingUrl", type: "text", label: "Staging URL" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "githubRepo", type: "text", label: "GitHub Repo" },
                { name: "vercelProject", type: "text", label: "Vercel Project" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "domainRegistrar", type: "text", label: "Domain Registrar" },
                { name: "dnsProvider", type: "text", label: "DNS Provider" },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "analyticsStatus",
                  type: "text",
                  label: "Analytics Status",
                  admin: { description: "e.g. GA4 connected, reporting active." },
                },
                {
                  name: "searchConsoleStatus",
                  type: "text",
                  label: "Search Console Status",
                },
                {
                  name: "workspaceStatus",
                  type: "text",
                  label: "Workspace Status",
                  admin: { description: "Google Workspace / email support status." },
                },
              ],
            },
            {
              name: "apiIntegrations",
              type: "textarea",
              label: "API Integrations",
              admin: { description: "Connected APIs and integration notes — no secrets." },
            },
            {
              name: "importantLinks",
              type: "array",
              label: "Important Links",
              fields: [
                { name: "label", type: "text", label: "Label" },
                { name: "url", type: "text", label: "URL" },
              ],
            },
            {
              name: "loginNotesReference",
              type: "textarea",
              label: "Login Notes Reference",
              admin: {
                description:
                  "Secure reference only — e.g. 1Password vault, Google Drive folder. " +
                  "Never store passwords or API keys here.",
              },
            },
          ],
        },
      ],
    },
  ],
};
