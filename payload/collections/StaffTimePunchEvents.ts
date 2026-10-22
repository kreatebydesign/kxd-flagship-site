/**
 * KXD OS V1.4 — Append-only staff time punch ledger.
 */
import type { CollectionConfig } from "payload";
import { isStudioPayloadOperator } from "../access/index.ts";
import { assertStaffTimeShiftInTransaction } from "../../lib/staff-time/correction-bypass.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

export const StaffTimePunchEvents: CollectionConfig = {
  slug: "staff-time-punch-events",
  labels: { singular: "Staff Time Punch", plural: "Staff Time Punches" },
  defaultSort: "-recordedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "eventType",
    defaultColumns: ["staffUser", "eventType", "recordedAt", "shift"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Immutable punch events — created by Staff Time Clock APIs only.",
  },
  access: {
    admin: ({ req: { user } }) => isStudioPayloadOperator(user),
    read: ({ req: { user } }) => isStudioPayloadOperator(user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ operation, req }) => {
        if (operation === "update") {
          throw new Error("Staff time punch events are immutable.");
        }
        if (operation === "create") {
          await assertStaffTimeShiftInTransaction(req);
        }
      },
    ],
  },
  fields: [
    {
      name: "shift",
      type: "relationship",
      relationTo: "staff-time-shifts",
      required: true,
    },
    {
      name: "staffUser",
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "eventType",
      type: "select",
      required: true,
      options: [
        { label: "Shift start", value: "shift_start" },
        { label: "Shift end", value: "shift_end" },
        { label: "Paid break start", value: "paid_break_start" },
        { label: "Paid break end", value: "paid_break_end" },
        { label: "Unpaid meal start", value: "unpaid_meal_start" },
        { label: "Unpaid meal end", value: "unpaid_meal_end" },
        { label: "Forgotten clock-out flag", value: "forgotten_clock_out_flag" },
        { label: "Correction note", value: "correction_note" },
      ],
    },
    {
      name: "recordedAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "actorUser",
      type: "relationship",
      relationTo: "users",
      required: true,
    },
    {
      name: "idempotencyKey",
      type: "text",
      admin: { description: "Client idempotency key — unique per staff user." },
    },
    {
      name: "payload",
      type: "json",
    },
  ],
};
