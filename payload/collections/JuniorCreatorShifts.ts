/**
 * payload/collections/JuniorCreatorShifts.ts
 * KXD OS — Junior Creator shift tracking (Phase 2B)
 */

import type { CollectionConfig } from "payload";
import { isPayloadAdmin, isPayloadAdminUser } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const JuniorCreatorShifts: CollectionConfig = {
  slug: "junior-creator-shifts",
  labels: { singular: "Junior Creator Shift", plural: "Junior Creator Shifts" },
  defaultSort: "-startedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "weekKey",
    defaultColumns: ["juniorCreatorUser", "status", "startedAt", "endedAt", "totalMinutes"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Junior Creator research shift sessions — started/ended via /junior-creators dashboard.",
  },
  access: {
    admin: ({ req: { user } }) => isPayloadAdmin(user),
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.collection === "junior-creator-users") {
        return { juniorCreatorUser: { equals: user.id } };
      }
      return isPayloadAdmin(user);
    },
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: "juniorCreatorUser",
      type: "relationship",
      relationTo: "junior-creator-users",
      required: true,
      label: "Junior Creator",
      admin: { position: "sidebar" },
    },
    {
      name: "startedAt",
      type: "date",
      required: true,
      label: "Started At",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "endedAt",
      type: "date",
      label: "Ended At",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "totalMinutes",
      type: "number",
      label: "Total Minutes",
      admin: { description: "Calculated server-side when a shift ends." },
    },
    {
      name: "weekKey",
      type: "text",
      required: true,
      label: "Week Key",
      admin: { description: "Monday date for the week this shift belongs to." },
    },
    {
      name: "hourlyRateCents",
      type: "number",
      required: true,
      label: "Hourly Rate (cents)",
      admin: { description: "Copied from the user record at shift start." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Voided", value: "voided" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes",
    },
  ],
};
