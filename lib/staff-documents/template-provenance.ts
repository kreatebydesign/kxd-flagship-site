import {
  SAMPLE_NONBINDING_AGREEMENT_BODY,
  SAMPLE_NONBINDING_AGREEMENT_TITLE,
  SAMPLE_NONBINDING_POLICY_BODY,
  SAMPLE_NONBINDING_POLICY_TITLE,
} from "./constants.ts";

/** Disposable DB gate scripts set this to exercise NONBINDING fixtures. */
export function isStaffDocumentQaAssignmentMode(): boolean {
  return process.env.STAFF_DOC_QA_ASSIGNMENT === "1";
}

export type StaffTemplateProvenanceInput = {
  isSample?: boolean | null;
  title?: string | null;
  body?: string | null;
};

const QA_MARKER_PATTERNS: RegExp[] = [
  /\bSAMPLE\b/i,
  /\bTEST\s+ONLY\b/i,
  /\bNONBINDING\b/i,
  /\bNOT\s+ENFORCEABLE\b/i,
  /\bNOT\s+A\s+BINDING\b/i,
  /\[TEST\b/i,
  /synthetic\s+test/i,
  /for\s+testing\s+only/i,
  /presentation-fixture@example\.com/i,
  /@example\.com\b/i,
  /\bexample\.org\b/i,
];

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function templateBodyMatchesKnownSampleFixture(body: string): boolean {
  const normalized = normalizeText(body);
  return (
    normalized === normalizeText(SAMPLE_NONBINDING_POLICY_BODY) ||
    normalized === normalizeText(SAMPLE_NONBINDING_AGREEMENT_BODY)
  );
}

export function templateTitleMatchesKnownSampleFixture(title: string): boolean {
  const normalized = normalizeText(title);
  return (
    normalized === normalizeText(SAMPLE_NONBINDING_POLICY_TITLE) ||
    normalized === normalizeText(SAMPLE_NONBINDING_AGREEMENT_TITLE) ||
    normalized.startsWith(normalizeText(SAMPLE_NONBINDING_POLICY_TITLE)) ||
    normalized.startsWith(normalizeText(SAMPLE_NONBINDING_AGREEMENT_TITLE))
  );
}

export function templateContainsQaMarkers(input: {
  title?: string | null;
  body?: string | null;
}): boolean {
  const combined = `${String(input.title ?? "")}\n${String(input.body ?? "")}`;
  return QA_MARKER_PATTERNS.some((pattern) => pattern.test(combined));
}

export function resolveStaffTemplateQaProvenance(
  input: StaffTemplateProvenanceInput,
): boolean {
  if (input.isSample === true) return true;
  const title = String(input.title ?? "");
  const body = String(input.body ?? "");
  if (templateTitleMatchesKnownSampleFixture(title)) return true;
  if (templateBodyMatchesKnownSampleFixture(body)) return true;
  if (templateContainsQaMarkers({ title, body })) return true;
  return false;
}

/** Operator draft placeholder before full agreement text is loaded (e.g. Tyler template #2). */
export const STAFF_DOCUMENT_TEMPLATE_BODY_PLACEHOLDER = "PENDING_BODY_LOAD";

export function staffDocumentTemplateBodyIsIncomplete(body: string | null | undefined): boolean {
  const trimmed = String(body ?? "").trim();
  if (!trimmed) return true;
  if (trimmed === STAFF_DOCUMENT_TEMPLATE_BODY_PLACEHOLDER) return true;
  if (trimmed.includes(STAFF_DOCUMENT_TEMPLATE_BODY_PLACEHOLDER)) return true;
  return false;
}

export function assertStaffTemplateBodyReadyForLegalReview(input: {
  body?: string | null;
}): void {
  if (staffDocumentTemplateBodyIsIncomplete(input.body)) {
    throw new Error(
      "Template body is incomplete or still a placeholder. Save the full agreement text before submitting for legal review.",
    );
  }
}

export function assertStaffTemplateMayEnterLegalReview(input: StaffTemplateProvenanceInput): void {
  if (resolveStaffTemplateQaProvenance(input)) {
    throw new Error(
      "QA sample templates cannot be submitted for legal review. Create a real template without sample markers.",
    );
  }
  assertStaffTemplateBodyReadyForLegalReview({ body: input.body });
}

export function assertStaffTemplateMayApproveForUse(input: StaffTemplateProvenanceInput): void {
  if (isStaffDocumentQaAssignmentMode()) return;
  if (resolveStaffTemplateQaProvenance(input)) {
    throw new Error(
      "QA or nonbinding sample templates cannot be approved for production use.",
    );
  }
}

export function assertStaffTemplateMayAssign(input: StaffTemplateProvenanceInput): void {
  if (isStaffDocumentQaAssignmentMode()) return;
  if (resolveStaffTemplateQaProvenance(input)) {
    throw new Error(
      "This template is marked as a QA sample or contains test-only content and cannot be assigned to staff.",
    );
  }
}
