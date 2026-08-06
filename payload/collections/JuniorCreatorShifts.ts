/**
 * payload/collections/JuniorCreatorShifts.ts
 * KXD OS — Junior Creator shift tracking (Phase 2B)
 */

import type { CollectionConfig } from "payload";
import {
  isPayloadAdminUser,
  isStudioPayloadOperator,
} from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const FINANCIAL_AUDIT_FIELDS = [
  "status",
  "startedAt",
  "endedAt",
  "totalMinutes",
  "weekKey",
  "hourlyRateCents",
  "payAdjustmentCents",
] as const;

function normalized(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

function auditWasOnlyAppended(originalAudit: unknown, nextAudit: unknown): boolean {
  const originalEntries = Array.isArray(originalAudit) ? originalAudit : [];
  const nextEntries = Array.isArray(nextAudit) ? nextAudit : [];
  if (nextEntries.length < originalEntries.length) return false;

  return originalEntries.every(
    (entry, index) => JSON.stringify(entry) === JSON.stringify(nextEntries[index]),
  );
}

function protectedShiftValuesChanged(originalDoc: AnyDoc, data: AnyDoc): boolean {
  return FINANCIAL_AUDIT_FIELDS.some((field) => {
    if (!(field in data)) return false;
    return normalized(data[field]) !== normalized(originalDoc[field]);
  });
}

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
    admin: ({ req: { user } }) => isStudioPayloadOperator(user),
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.collection === "junior-creator-users") {
        return { juniorCreatorUser: { equals: user.id } };
      }
      return isStudioPayloadOperator(user);
    },
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation !== "update" || !originalDoc) return data;

        const originalAudit = originalDoc.correctionAudit;
        const nextAudit = data.correctionAudit ?? originalAudit;
        const auditAppendOnly = auditWasOnlyAppended(originalAudit, nextAudit);
        if (!auditAppendOnly) {
          throw new Error("correctionAudit is immutable and may only be appended.");
        }

        const originalStatus = String(originalDoc.status ?? "");
        const isCompletedOrVoided = originalStatus === "completed" || originalStatus === "voided";
        if (isCompletedOrVoided && protectedShiftValuesChanged(originalDoc as AnyDoc, data as AnyDoc)) {
          const originalLength = Array.isArray(originalAudit) ? originalAudit.length : 0;
          const nextLength = Array.isArray(nextAudit) ? nextAudit.length : 0;
          if (nextLength <= originalLength) {
            throw new Error(
              "Completed or voided shift corrections require an appended correctionAudit entry.",
            );
          }
        }

        return data;
      },
    ],
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
      name: "payAdjustmentCents",
      type: "number",
      defaultValue: 0,
      label: "Manual Pay Adjustment (cents)",
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
        description:
          "Read-only in Payload Admin. Use Junior Creator Admin corrections so audit history is preserved.",
      },
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
      name: "correctionAudit",
      type: "json",
      label: "Correction Audit",
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
        description:
          "Immutable correction history. Use Junior Creator Admin corrections; this field may only be appended by audited server actions.",
      },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes",
    },
  ],
};
