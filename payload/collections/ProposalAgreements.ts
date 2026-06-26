import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const ProposalAgreements: CollectionConfig = {
  slug: "proposal-agreements",
  labels: { singular: "Proposal Agreement", plural: "Proposal Agreements" },
  defaultSort: "-signedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "signerName",
    defaultColumns: ["proposal", "signerName", "signerEmail", "company", "signedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Digital agreements embedded in KXD proposals.",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "proposal",
      type: "relationship",
      relationTo: "proposals",
      required: true,
      label: "Proposal",
      admin: { position: "sidebar" },
    },
    {
      name: "agreementVersion",
      type: "text",
      required: true,
      label: "Agreement Version",
      defaultValue: "1.0",
      admin: { position: "sidebar" },
    },
    { name: "signerName", type: "text", required: true, label: "Signer Name" },
    { name: "signerEmail", type: "email", required: true, label: "Signer Email" },
    { name: "company", type: "text", label: "Company" },
    {
      name: "signatureImage",
      type: "textarea",
      label: "Signature Image",
      admin: { description: "Base64 data URL of drawn signature." },
    },
    {
      name: "signedAt",
      type: "date",
      required: true,
      label: "Signed At",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    { name: "ipAddress", type: "text", label: "IP Address" },
    { name: "userAgent", type: "textarea", label: "User Agent" },
    { name: "acceptanceHash", type: "text", label: "Acceptance Hash" },
    {
      name: "acceptedTermsVersion",
      type: "text",
      required: true,
      label: "Accepted Terms Version",
    },
  ],
};
