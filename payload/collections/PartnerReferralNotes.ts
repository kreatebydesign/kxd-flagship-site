/**
 * Partner-authored append-only notes on their own referrals.
 * Never mixed with KXD internal notes or sales activity notes.
 */
import type { CollectionConfig } from "payload";
import { isPayloadAdminUser, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const PartnerReferralNotes: CollectionConfig = {
  slug: "partner-referral-notes",
  labels: {
    singular: "Partner Referral Note",
    plural: "Partner Referral Notes",
  },
  defaultSort: "-createdAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "body",
    defaultColumns: ["sourcedByPartnerName", "referral", "createdAt"],
    group: PAYLOAD_GROUPS.leads,
    description:
      "Partner-visible follow-up notes. Append-only from Partner Portal. " +
      "Never expose KXD internal notes here.",
  },
  access: {
    read: ({ req: { user } }) => Boolean(user) && isStudioPayloadOperator(user),
    create: isPayloadAdminUser,
    update: () => false,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "referral",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "partner-referrals" as any,
      required: true,
      label: "Referral",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "sourcedByPartner",
      type: "relationship",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: "kxd-partner-profiles" as any,
      required: true,
      label: "Partner",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "sourcedByPartnerName",
      type: "text",
      required: true,
      label: "Partner name",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "body",
      type: "textarea",
      required: true,
      label: "Note",
    },
    {
      name: "actorDisplayName",
      type: "text",
      required: true,
      label: "Actor",
      admin: {
        description: "Display name at write time (partner session).",
        readOnly: true,
      },
    },
  ],
};
