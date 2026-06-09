import type { CollectionConfig } from "payload";
import { isAuthenticated, publicCreate } from "../access";
import { PAYLOAD_GROUPS } from "../admin/groups";
import { notifyInquiryCreated } from "../hooks/inquiries";

export const PlatformApplications: CollectionConfig = {
  slug: "platform-applications",
  labels: { singular: "Platform application", plural: "Platform applications" },
  admin: {
    useAsTitle: "companyName",
    defaultColumns: ["companyName", "contactName", "platformType", "status", "createdAt"],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Applications for operational platforms and enterprise systems — not software sales.",
  },
  access: {
    read: isAuthenticated,
    create: publicCreate,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [notifyInquiryCreated],
  },
  fields: [
    {
      name: "companyName",
      type: "text",
      required: true,
    },
    {
      name: "contactName",
      type: "text",
      required: true,
    },
    {
      name: "email",
      type: "email",
      required: true,
    },
    {
      name: "platformType",
      type: "select",
      required: true,
      options: [
        { label: "Membership Platform", value: "membership-platform" },
        { label: "Operational Platform", value: "operational-platform" },
        { label: "Client Portal", value: "client-portal" },
        { label: "Enterprise System", value: "enterprise-system" },
      ],
    },
    {
      name: "currentState",
      type: "textarea",
      required: true,
      admin: {
        description: "What exists today — tools, workflows, constraints.",
      },
    },
    {
      name: "objectives",
      type: "textarea",
      required: true,
    },
    {
      name: "teamSize",
      type: "select",
      options: [
        { label: "1–10", value: "1-10" },
        { label: "11–50", value: "11-50" },
        { label: "51–200", value: "51-200" },
        { label: "200+", value: "200-plus" },
      ],
    },
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "Reviewing", value: "reviewing" },
        { label: "Discovery", value: "discovery" },
        { label: "Approved", value: "approved" },
        { label: "Declined", value: "declined" },
      ],
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "kxdOs",
      type: "group",
      label: "KXD OS",
      fields: [
        {
          name: "applicationId",
          type: "text",
          admin: { readOnly: true },
        },
      ],
    },
  ],
};
