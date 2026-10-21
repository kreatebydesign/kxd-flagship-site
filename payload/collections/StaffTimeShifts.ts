/**
 * KXD OS V1.4 — Staff time shift sessions (authoritative via punch ledger).
 */
import type { CollectionConfig } from "payload";
import { isPayloadAdminUser, isStudioPayloadOperator } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const IMMUTABLE_AFTER_COMPLETE = [
  "startedAt",
  "staffUser",
  "workTimezone",
  "localDateKey",
  "workIntentCategory",
  "workIntentWorkId",
  "workIntentClientId",
] as const;

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
      "Internal staff shift sessions. Mutations occur via Staff Time Clock APIs.",
  },
  access: {
    admin: ({ req: { user } }) => isStudioPayloadOperator(user),
    read: ({ req: { user } }) => isStudioPayloadOperator(user),
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation !== "update" || !originalDoc) return data;
        const status = String(originalDoc.status ?? "");
        if (status === "completed" || status === "voided") {
          for (const field of IMMUTABLE_AFTER_COMPLETE) {
            if (field in data && data[field] !== originalDoc[field]) {
              throw new Error(
                `Completed staff shifts cannot change ${field}. Use correction workflow.`,
              );
            }
          }
        }
        const originalAudit = originalDoc.auditEvents;
        const nextAudit = data.auditEvents ?? originalAudit;
        const originalEntries = Array.isArray(originalAudit) ? originalAudit : [];
        const nextEntries = Array.isArray(nextAudit) ? nextAudit : [];
        if (nextEntries.length < originalEntries.length) {
          throw new Error("staff time auditEvents are append-only.");
        }
        const prefixOk = originalEntries.every((entry, index) => {
          const next = nextEntries[index];
          if (!next || typeof entry !== "object" || typeof next !== "object") {
            return false;
          }
          const a = entry as AnyDoc;
          const b = next as AnyDoc;
          return (
            String(a.id ?? "") === String(b.id ?? "") &&
            String(a.at ?? "") === String(b.at ?? "") &&
            String(a.action ?? "") === String(b.action ?? "") &&
            Number(a.actorUserId ?? 0) === Number(b.actorUserId ?? 0)
          );
        });
        if (!prefixOk) {
          throw new Error("staff time auditEvents are append-only.");
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
