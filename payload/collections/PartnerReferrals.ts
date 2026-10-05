/**
 * Partner Portal referral intake — sibling to research-leads.
 * Promotes into sales-leads. Never writes client-inquiries.
 */
import type { CollectionConfig } from "payload";
import { isAuthenticated, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const PARTNER_VISIBILITY_STATES = [
  { label: "Submitted", value: "submitted" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Qualified", value: "qualified" },
  { label: "Discovery booked", value: "discovery_booked" },
  { label: "Proposal in motion", value: "proposal_in_motion" },
  { label: "Won", value: "won" },
  { label: "Not moving forward", value: "not_moving_forward" },
] as const;

export const PartnerReferrals: CollectionConfig = {
  slug: "partner-referrals",
  labels: { singular: "Partner Referral", plural: "Partner Referrals" },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "businessName",
    defaultColumns: [
      "businessName",
      "contactName",
      "partnerVisibilityState",
      "sourcedByPartner",
      "createdAt",
    ],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Partner-submitted referral intake. Flows into sales-leads for operator review. " +
      "Partner Portal shows visibility states only — never internal notes or financials.",
  },
  access: {
    read: ({ req: { user } }) => Boolean(user && user.collection === "users"),
    create: ({ req: { user } }) => Boolean(user && user.collection === "users"),
    update: isAuthenticated,
    delete: ({ req: { user } }) => isStudioPayloadOperator(user),
  },
  fields: [
    {
      name: "sourcedByPartner",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "kxd-partner-profiles" as any,
      required: true,
      label: "Sourced By Partner",
      admin: {
        position: "sidebar",
        description: "Attribution — set from Partner Portal session. Read-only after create.",
        readOnly: true,
      },
    },
    {
      name: "sourcedByPartnerName",
      type: "text",
      label: "Partner Name",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Denormalized partner display name.",
      },
    },
    {
      name: "partnerVisibilityState",
      type: "select",
      required: true,
      defaultValue: "submitted",
      label: "Partner Visibility State",
      options: [...PARTNER_VISIBILITY_STATES],
      admin: {
        position: "sidebar",
        description:
          "Partner-facing visibility only. Operators may update; partners cannot write this.",
      },
    },
    {
      name: "internalStatus",
      type: "select",
      required: true,
      defaultValue: "new",
      label: "Internal Status",
      options: [
        { label: "New", value: "new" },
        { label: "Reviewing", value: "reviewing" },
        { label: "Qualified", value: "qualified" },
        { label: "In conversation", value: "in_conversation" },
        { label: "Closed", value: "closed" },
      ],
      admin: {
        position: "sidebar",
        description: "Internal operator queue status. Never shown to partners.",
      },
    },
    {
      name: "promotedSalesLead",
      type: "relationship",
      relationTo: "sales-leads",
      label: "Promoted Sales Opportunity",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Set when promoted into Sales. Never deleted on promote.",
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
      type: "tabs",
      tabs: [
        {
          label: "Opportunity",
          fields: [
            { name: "businessName", type: "text", required: true, label: "Business name" },
            { name: "contactName", type: "text", required: true, label: "Contact name" },
            { name: "contactRole", type: "text", label: "Contact role" },
            { name: "phone", type: "text", label: "Phone" },
            { name: "email", type: "email", label: "Email" },
            { name: "website", type: "text", label: "Website" },
            { name: "instagramSocial", type: "text", label: "Instagram / social" },
            { name: "industry", type: "text", label: "Industry" },
            {
              name: "whatTheyWantMoreOf",
              type: "textarea",
              label: "What they want more of",
            },
            {
              name: "visibleProblemOpportunity",
              type: "textarea",
              label: "Visible problem / opportunity",
            },
            { name: "whyNow", type: "textarea", label: "Why now" },
            {
              name: "decisionMakerConfirmed",
              type: "checkbox",
              label: "Decision maker confirmed",
              defaultValue: false,
            },
            {
              name: "bestTimeForDiscoveryCall",
              type: "textarea",
              label: "Best time for a KXD discovery call",
            },
            {
              name: "partnerNotes",
              type: "textarea",
              label: "Partner notes",
              admin: {
                description: "Notes from the partner. Visible to operators; not editable by partner after submit.",
              },
            },
          ],
        },
        {
          label: "Internal",
          fields: [
            {
              name: "internalNotes",
              type: "textarea",
              label: "Internal notes",
              admin: {
                description: "Operator-only. Never shown in Partner Portal.",
              },
            },
          ],
        },
      ],
    },
  ],
};
