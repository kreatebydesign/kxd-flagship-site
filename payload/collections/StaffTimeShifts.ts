/**
 * KXD OS V1.4 — Staff time shift sessions (authoritative via punch ledger).
 */
import type { CollectionConfig } from "payload";
import { isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";
import {
  assertNoForgedStaffTimeCorrectionContext,
  assertStaffTimeShiftInTransaction,
  isStaffTimeOperatorCorrectionAuthorized,
} from "../../lib/staff-time/correction-bypass.ts";
import {
  validateStaffTimeShiftCreate,
  validateStaffTimeShiftUpdate,
} from "../../lib/staff-time/shift-mutation-guard.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export const StaffTimeShifts: CollectionConfig = {
  slug: "staff-time-shifts",
  labels: { singular: "Staff Time Shift", plural: "Staff Time Shifts" },
  defaultSort: "-startedAt",
  lockDocuments: false,
  admin: {
    useAsTitle: "localDateKey",
    defaultColumns: ["staffUser", "status", "startedAt", "endedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description:
      "Read-only in Payload Admin. Mutations occur via Staff Time Clock and operator correction APIs.",
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
      async ({ data, operation, originalDoc, req }) => {
        await assertNoForgedStaffTimeCorrectionContext(req);
        const operatorBypass = await isStaffTimeOperatorCorrectionAuthorized(req);

        if (operation === "create") {
          await assertStaffTimeShiftInTransaction(req);
          validateStaffTimeShiftCreate(data as AnyDoc, operatorBypass);
          return data;
        }

        if (operation === "update" && originalDoc) {
          await assertStaffTimeShiftInTransaction(req);
          validateStaffTimeShiftUpdate({
            data: data as AnyDoc,
            originalDoc: originalDoc as AnyDoc,
            operatorBypass,
          });
        }

        return data;
      },
    ],
  },
  fields: [
    {
      name: "staffUser",
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Unresolved", value: "unresolved" },
        { label: "Voided", value: "voided" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "startedAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "endedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "workTimezone",
      type: "text",
      required: true,
    },
    {
      name: "localDateKey",
      type: "text",
      required: true,
      admin: { description: "Civil date (YYYY-MM-DD) in work timezone at shift start." },
    },
    {
      name: "workIntentCategory",
      type: "select",
      required: true,
      options: [
        { label: "Assigned KXD work", value: "assigned_kxd_work" },
        { label: "Client project", value: "client_project" },
        { label: "Meeting", value: "meeting" },
        { label: "Training", value: "training" },
        { label: "Internal operations", value: "internal_operations" },
        { label: "Other authorized", value: "other_authorized" },
      ],
    },
    {
      name: "workIntentWorkId",
      type: "number",
      admin: { description: "Work item id when category is assigned_kxd_work." },
    },
    {
      name: "workIntentClientId",
      type: "number",
      admin: { description: "Client id when category is client_project." },
    },
    {
      name: "workIntentNote",
      type: "textarea",
    },
    {
      name: "payPeriodId",
      type: "number",
      admin: { description: "staff_pay_periods.id at shift start." },
    },
    {
      name: "auditEvents",
      type: "json",
      admin: {
        readOnly: true,
        description: "Append-only audit trail for shift lifecycle.",
      },
    },
  ],
};
