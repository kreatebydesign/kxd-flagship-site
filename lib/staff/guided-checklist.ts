/**
 * Guided work completion checklist — shared between loader, API, and UI.
 */

export const STAFF_GUIDED_CHECKLIST_IDS = [
  "understood",
  "no-invention",
  "boundary",
  "matt",
] as const;

export type StaffGuidedChecklistId = (typeof STAFF_GUIDED_CHECKLIST_IDS)[number];

export interface StaffGuidedChecklistItem {
  id: StaffGuidedChecklistId;
  label: string;
  required: boolean;
}

export function buildStaffGuidedChecklistItems(
  requiresMattApproval: boolean,
): StaffGuidedChecklistItem[] {
  return [
    { id: "understood", label: "I understand what was requested", required: true },
    {
      id: "no-invention",
      label: "I did not invent client facts, prices, or dates",
      required: true,
    },
    { id: "boundary", label: "I stayed inside my permission boundary", required: true },
    {
      id: "matt",
      label: requiresMattApproval
        ? "Ready for review"
        : "I confirmed completion intentionally",
      required: true,
    },
  ];
}

const VALID_IDS = new Set<string>(STAFF_GUIDED_CHECKLIST_IDS);

export function sanitizeStaffGuidedChecklist(
  input: Record<string, unknown> | null | undefined,
): Partial<Record<StaffGuidedChecklistId, boolean>> {
  if (!input || typeof input !== "object") return {};
  const out: Partial<Record<StaffGuidedChecklistId, boolean>> = {};
  for (const id of STAFF_GUIDED_CHECKLIST_IDS) {
    if (id in input) {
      out[id] = Boolean(input[id]);
    }
  }
  return out;
}

export function mergeChecklistState(
  items: StaffGuidedChecklistItem[],
  saved: Partial<Record<StaffGuidedChecklistId, boolean>> | null | undefined,
): Record<StaffGuidedChecklistId, boolean> {
  const base = Object.fromEntries(
    items.map((item) => [item.id, false]),
  ) as Record<StaffGuidedChecklistId, boolean>;
  if (!saved) return base;
  for (const item of items) {
    if (saved[item.id] === true) base[item.id] = true;
  }
  return base;
}

export function allRequiredChecklistItemsChecked(
  items: StaffGuidedChecklistItem[],
  checked: Record<StaffGuidedChecklistId, boolean>,
): boolean {
  return items.filter((item) => item.required).every((item) => checked[item.id]);
}

export function formatChecklistActivityDetail(
  items: StaffGuidedChecklistItem[],
  checked: Record<StaffGuidedChecklistId, boolean>,
): string {
  const labels = items
    .filter((item) => checked[item.id])
    .map((item) => item.label);
  if (labels.length === 0) return "No items marked complete.";
  return labels.join(" · ");
}

export function isValidChecklistPayload(
  input: Record<string, unknown> | null | undefined,
): boolean {
  if (!input || typeof input !== "object") return false;
  return Object.keys(input).every((key) => VALID_IDS.has(key));
}
