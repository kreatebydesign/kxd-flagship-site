import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ClientSuccessPlans: CollectionConfig = {
  slug: "client-success-plans",
  labels: { singular: "Client Success Plan", plural: "Client Success Plans" },
  defaultSort: "-updatedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "client",
    defaultColumns: ["client", "successScore", "nextReview", "renewalDate", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Ongoing client success strategy — one plan per client. OS: /admin/operations/client-success",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
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
      name: "accountManager",
      type: "relationship",
      relationTo: "users",
      label: "Account Manager",
      admin: { position: "sidebar" },
    },
    {
      name: "successScore",
      type: "number",
      label: "Success Score",
      admin: { position: "sidebar", description: "0–100 relationship success score" },
    },
    {
      name: "renewalDate",
      type: "date",
      label: "Renewal Date",
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
    },
    {
      name: "nextReview",
      type: "date",
      label: "Next Review",
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Success Plan",
          fields: [
            { name: "currentFocus", type: "textarea", label: "Current Focus" },
            { name: "quarterlyGoals", type: "textarea", label: "Quarterly Goals" },
            { name: "yearlyGoals", type: "textarea", label: "Yearly Goals" },
            { name: "carePlan", type: "textarea", label: "Care Plan" },
            { name: "risks", type: "textarea", label: "Risks" },
            { name: "opportunities", type: "textarea", label: "Opportunities" },
            { name: "notes", type: "textarea", label: "Notes" },
          ],
        },
      ],
    },
  ],
};
