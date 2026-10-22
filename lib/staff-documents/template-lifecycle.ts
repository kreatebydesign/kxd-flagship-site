import type { StaffDocumentTemplateStatus } from "./types.ts";
import { isStaffDocumentQaAssignmentMode } from "./template-provenance.ts";

const TRANSITIONS: Record<
  StaffDocumentTemplateStatus,
  readonly StaffDocumentTemplateStatus[]
> = {
  draft: ["legal-review", "retired"],
  "legal-review": ["draft", "approved-for-use", "retired"],
  "approved-for-use": ["retired"],
  retired: [],
};

export function assertStaffTemplateStatusTransition(input: {
  from: StaffDocumentTemplateStatus;
  to: StaffDocumentTemplateStatus;
}): void {
  const { from, to } = input;
  if (from === to) return;

  if (
    from === "draft" &&
    to === "approved-for-use" &&
    isStaffDocumentQaAssignmentMode()
  ) {
    return;
  }

  if (from === "draft" && to === "approved-for-use") {
    throw new Error(
      "Templates must be submitted for legal review before approval.",
    );
  }

  const allowed = TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Cannot move template from ${from} to ${to}.`);
  }
}

export function staffTemplateStatusIsEditable(status: StaffDocumentTemplateStatus): boolean {
  return status === "draft";
}
