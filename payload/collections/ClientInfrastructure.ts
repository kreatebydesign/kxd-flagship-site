import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import { publishInfrastructureActivityHook } from "../hooks/client-activity.ts";

export const ClientInfrastructure: CollectionConfig = {
  slug: "client-infrastructure",
  labels: { singular: "Client Infrastructure", plural: "Client Infrastructure" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "primaryDomain",
    defaultColumns: [
      "client",
      "status",
      "infrastructureScore",
      "primaryDomain",
      "hostingProvider",
      "nextRenewalDate",
      "updatedAt",
    ],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Digital infrastructure registry — domains, DNS, hosting, deployments, analytics, email, payments, and stack costs. " +
      "Dashboard: /admin/operations/infrastructure",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [publishInfrastructureActivityHook],
  },
  fields: [
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      unique: true,
      label: "Client",
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      label: "Health Status",
      required: true,
      defaultValue: "unknown",
      options: [
        { label: "Healthy", value: "healthy" },
        { label: "Needs Attention", value: "attention" },
        { label: "Critical", value: "critical" },
        { label: "Unknown", value: "unknown" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "infrastructureScore",
      type: "number",
      label: "Infrastructure Score",
      min: 0,
      max: 100,
      admin: {
        position: "sidebar",
        description: "0–100 composite health score. Auto-calculated when possible.",
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Domain & DNS",
          fields: [
            { name: "primaryDomain", type: "text", label: "Primary Domain" },
            { name: "domainRegistrar", type: "text", label: "Domain Registrar" },
            {
              name: "domainExpirationDate",
              type: "date",
              label: "Domain Expiration",
              admin: { date: { pickerAppearance: "dayOnly" } },
            },
            {
              name: "domainAutoRenew",
              type: "checkbox",
              label: "Domain Auto-Renew",
              defaultValue: false,
            },
            { name: "dnsProvider", type: "text", label: "DNS Provider" },
            { name: "nameservers", type: "textarea", label: "Nameservers" },
            {
              name: "sslStatus",
              type: "select",
              label: "SSL Status",
              defaultValue: "unknown",
              options: [
                { label: "Unknown", value: "unknown" },
                { label: "Valid", value: "valid" },
                { label: "Expiring Soon", value: "expiring" },
                { label: "Expired", value: "expired" },
                { label: "Missing", value: "missing" },
              ],
            },
            {
              name: "sslExpirationDate",
              type: "date",
              label: "SSL Expiration",
              admin: { date: { pickerAppearance: "dayOnly" } },
            },
          ],
        },
        {
          label: "Hosting & Deploy",
          fields: [
            { name: "hostingProvider", type: "text", label: "Hosting Provider" },
            { name: "productionUrl", type: "text", label: "Production URL" },
            { name: "stagingUrl", type: "text", label: "Staging URL" },
            { name: "githubRepo", type: "text", label: "GitHub Repository" },
            { name: "vercelProject", type: "text", label: "Vercel Project" },
            { name: "vercelTeam", type: "text", label: "Vercel Team" },
            {
              name: "lastDeploymentDate",
              type: "date",
              label: "Last Deployment",
              admin: { date: { pickerAppearance: "dayAndTime" } },
            },
            {
              name: "deploymentStatus",
              type: "select",
              label: "Deployment Status",
              defaultValue: "unknown",
              options: [
                { label: "Unknown", value: "unknown" },
                { label: "Live", value: "live" },
                { label: "Building", value: "building" },
                { label: "Failed", value: "failed" },
                { label: "Idle", value: "idle" },
              ],
            },
          ],
        },
        {
          label: "Analytics & Email",
          fields: [
            { name: "analyticsProvider", type: "text", label: "Analytics Provider" },
            { name: "ga4PropertyId", type: "text", label: "GA4 Property ID" },
            {
              name: "searchConsoleSiteUrl",
              type: "text",
              label: "Search Console Site URL",
              admin: {
                description:
                  "Exact Search Console property identifier — URL-prefix (https://example.com/) or domain (sc-domain:example.com).",
              },
            },
            {
              name: "searchConsoleStatus",
              type: "select",
              label: "Search Console",
              defaultValue: "unknown",
              options: [
                { label: "Unknown", value: "unknown" },
                { label: "Connected", value: "connected" },
                { label: "Not Connected", value: "not-connected" },
                { label: "Pending", value: "pending" },
              ],
            },
            { name: "emailProvider", type: "text", label: "Email Provider" },
            { name: "workspaceProvider", type: "text", label: "Workspace Provider" },
            { name: "emailDomain", type: "text", label: "Email Domain" },
            {
              name: "spfStatus",
              type: "select",
              label: "SPF",
              defaultValue: "unknown",
              options: [
                { label: "Unknown", value: "unknown" },
                { label: "Valid", value: "valid" },
                { label: "Missing", value: "missing" },
                { label: "Misconfigured", value: "misconfigured" },
              ],
            },
            {
              name: "dkimStatus",
              type: "select",
              label: "DKIM",
              defaultValue: "unknown",
              options: [
                { label: "Unknown", value: "unknown" },
                { label: "Valid", value: "valid" },
                { label: "Missing", value: "missing" },
                { label: "Misconfigured", value: "misconfigured" },
              ],
            },
            {
              name: "dmarcStatus",
              type: "select",
              label: "DMARC",
              defaultValue: "unknown",
              options: [
                { label: "Unknown", value: "unknown" },
                { label: "Valid", value: "valid" },
                { label: "Missing", value: "missing" },
                { label: "Misconfigured", value: "misconfigured" },
              ],
            },
            {
              name: "stripeStatus",
              type: "select",
              label: "Stripe",
              defaultValue: "unknown",
              options: [
                { label: "Unknown", value: "unknown" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Not Configured", value: "not-configured" },
              ],
            },
            {
              name: "resendStatus",
              type: "select",
              label: "Resend",
              defaultValue: "unknown",
              options: [
                { label: "Unknown", value: "unknown" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Not Configured", value: "not-configured" },
              ],
            },
          ],
        },
        {
          label: "Costs & Review",
          fields: [
            {
              name: "monthlyStackCost",
              type: "number",
              label: "Monthly Stack Cost ($)",
              admin: { description: "Total recurring monthly infrastructure spend." },
            },
            {
              name: "annualRenewalCost",
              type: "number",
              label: "Annual Renewal Cost ($)",
              admin: { description: "Estimated annual renewal obligations." },
            },
            { name: "renewalNotes", type: "textarea", label: "Renewal Notes" },
            {
              name: "nextRenewalDate",
              type: "date",
              label: "Next Renewal Date",
              admin: { date: { pickerAppearance: "dayOnly" } },
            },
            {
              name: "lastReviewedAt",
              type: "date",
              label: "Last Reviewed",
              admin: { date: { pickerAppearance: "dayAndTime" } },
            },
            { name: "reviewedBy", type: "text", label: "Reviewed By" },
            { name: "internalNotes", type: "textarea", label: "Internal Notes" },
          ],
        },
      ],
    },
  ],
};
