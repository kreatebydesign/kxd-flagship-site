import type { CollectionConfig } from "payload";
import { isAuthenticated, publicCreate, publicRead } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const Inquiries: CollectionConfig = {
  slug: "inquiries",
  labels: { singular: "Inquiry", plural: "Inquiries" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "inquiryType", "status", "createdAt"],
    group: PAYLOAD_GROUPS.leads,
    description: "Website inquiries routed to matt@kreatebydesign.com.",
  },
  access: {
    read: isAuthenticated,
    create: publicCreate,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  // Email notifications are sent directly in app/api/inquiries/route.ts
  // to ensure console.log visibility in Vercel logs. The notifyInquiryCreated
  // hook is preserved in payload/hooks/inquiries.ts for admin-created entries
  // if re-enabled in the future.
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
        description: "Page or campaign source.",
      },
    },
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "Contacted", value: "contacted" },
        { label: "Qualified", value: "qualified" },
        { label: "Closed", value: "closed" },
        { label: "Spam", value: "spam" },
      ],
      admin: {
        position: "sidebar",
      },
    },
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
};
