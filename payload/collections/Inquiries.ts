import type { CollectionConfig } from "payload";
import { isAuthenticated, publicCreate } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const Inquiries: CollectionConfig = {
  slug: "inquiries",
  labels: { singular: "Inquiry", plural: "Inquiries" },
  admin: {
    useAsTitle: "name",
    defaultColumns: [
      "name",
      "email",
      "company",
      "inquiryType",
      "partnershipPackage",
      "status",
      "priority",
      "createdAt",
    ],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Website inquiries routed to matt@kreatebydesign.com and managed as KXD leads.",
  },
  access: {
    read: isAuthenticated,
    create: publicCreate,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  // Email notifications are sent directly in app/api/inquiries/route.ts.
  // Do not re-enable duplicate hooks unless production email behavior changes.
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Lead Details",
          fields: [
            {
              name: "name",
              type: "text",
              required: true,
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "company",
              type: "text",
            },
            {
              name: "phone",
              type: "text",
            },
            {
              name: "inquiryType",
              type: "select",
              required: true,
              defaultValue: "luxury-website-experiences",
              options: [
                { label: "Luxury Website Experiences", value: "luxury-website-experiences" },
                { label: "Brand Systems & Identity", value: "brand-systems-identity" },
                { label: "Growth Infrastructure", value: "growth-infrastructure" },
                { label: "Enterprise Platforms", value: "enterprise-platforms" },
                { label: "Ongoing Partnership", value: "ongoing-partnership" },
                { label: "General / Unsure", value: "general" },
              ],
            },
            {
              name: "budget",
              type: "select",
              options: [
                { label: "Under $5,000", value: "under-5k" },
                { label: "$5,000 – $10,000", value: "5k-10k" },
                { label: "$10,000 – $25,000", value: "10k-25k" },
                { label: "$25,000 – $50,000", value: "25k-50k" },
                { label: "$50,000+", value: "50k-plus" },
              ],
            },
            {
              name: "timeline",
              type: "select",
              options: [
                { label: "Immediately", value: "immediate" },
                { label: "Within 30 Days", value: "within-30-days" },
                { label: "Within 60–90 Days", value: "60-90-days" },
                { label: "Exploring Options", value: "exploring" },
              ],
            },
            {
              name: "message",
              type: "textarea",
              required: true,
            },
            {
              name: "source",
              type: "text",
              admin: {
                description: "Page, campaign, or referral source.",
              },
            },
            {
              name: "website",
              type: "text",
              admin: {
                description: "Prospect website provided on the inquiry form.",
              },
            },
            {
              name: "partnershipPackage",
              type: "select",
              label: "Partnership of Interest",
              options: [
                { label: "KXD Partnership", value: "partnership" },
                { label: "KXD Operating Partnership", value: "operating" },
                { label: "KXD Executive Partnership", value: "executive" },
              ],
              admin: {
                description:
                  "Selected on /pricing when present. Independent of entitlement presets.",
              },
            },
          ],
        },
        {
          label: "KXD Workflow",
          fields: [
            {
              name: "internalNotes",
              type: "textarea",
              admin: {
                description:
                  "Private KXD notes for qualification, follow-up, proposal context, or next steps.",
              },
            },
            {
              name: "nextStep",
              type: "text",
              admin: {
                description: "The next action needed to move this lead forward.",
              },
            },
            {
              name: "followUpDate",
              type: "date",
              admin: {
                date: {
                  pickerAppearance: "dayOnly",
                },
                description: "Optional date for next follow-up.",
              },
            },
            {
              name: "assignedOwner",
              type: "text",
              defaultValue: "Matt / KXD",
              admin: {
                description: "Internal owner responsible for this lead.",
              },
            },
          ],
        },
        {
          label: "Payment",
          fields: [
            {
              name: "stripe",
              type: "group",
              label: "Payment",
              admin: {
                description: "Prepared for future Stripe deposit and checkout flows.",
              },
              fields: [
                {
                  name: "paymentIntentId",
                  type: "text",
                  admin: { readOnly: true },
                },
                {
                  name: "paymentStatus",
                  type: "select",
                  defaultValue: "none",
                  options: [
                    { label: "None", value: "none" },
                    { label: "Pending", value: "pending" },
                    { label: "Paid", value: "paid" },
                    { label: "Failed", value: "failed" },
                  ],
                },
                {
                  name: "depositAmount",
                  type: "number",
                  admin: {
                    description: "Amount in cents.",
                  },
                },
              ],
            },
          ],
        },
        {
          label: "KXD OS",
          fields: [
            {
              name: "kxdOs",
              type: "group",
              label: "KXD OS",
              admin: {
                description: "Future CRM and workspace linkage.",
              },
              fields: [
                {
                  name: "leadId",
                  type: "text",
                  admin: { readOnly: true },
                },
                {
                  name: "workspaceId",
                  type: "text",
                  admin: { readOnly: true },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "Reviewed", value: "reviewed" },
        { label: "In Progress", value: "in-progress" },
        { label: "Proposal Sent", value: "proposal-sent" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" },
        { label: "Archived", value: "archived" },
        { label: "Spam", value: "spam" },
      ],
      admin: {
        position: "sidebar",
        description: "Current lead stage.",
      },
    },
    {
      name: "priority",
      type: "select",
      defaultValue: "standard",
      options: [
        { label: "Standard", value: "standard" },
        { label: "High", value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
      admin: {
        position: "sidebar",
        description: "Internal priority level.",
      },
    },
  ],
};