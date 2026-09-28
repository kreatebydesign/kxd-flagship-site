/**
 * Client-facing work-item presentation for branded monthly reports.
 * Never dumps raw operator deliverable notes into client output.
 */

import { sanitizeReportText, stripClientFacingOperatorLeaks } from "./sanitize";
import type { CompletedWorkItem } from "./types";

export type ClientFacingWorkStatus =
  | "complete"
  | "in-progress"
  | "waiting-on-client"
  | "blocked"
  | "not-started";

const STATUS_LABEL: Record<ClientFacingWorkStatus, string> = {
  complete: "Completed",
  "in-progress": "In progress",
  "waiting-on-client": "Waiting on you",
  blocked: "Blocked",
  "not-started": "Not started",
};

/** Phrases that belong in operator records, not client-facing summaries. */
const INTERNAL_WORK_SUMMARY_PATTERNS: RegExp[] = [
  /\bdeliverable\b/gi,
  /\bmonthly-deliverables?\b/gi,
  /\boverrideAccess\b/gi,
  /\bpayload\b/gi,
  /\bdatabase\b/gi,
  /\binternal\b/gi,
  /\boperator\b/gi,
  /\bdo not (?:treat|describe|mark|assert|write)\b/gi,
  /\bnot asserted\b/gi,
  /\bhistorical (?:status|note|portfolio|reporting|work)\b/gi,
  /\bsupport case\b/gi,
  /\bgoogle support case\b/gi,
  /\bunresolved google support\b/gi,
  /\bprior aug(?:ust)?\s+\d+\b/gi,
  /\bexact completion day\b/gi,
  /\bdocumented (?:july|august|september)\b/gi,
  /\bsee deliverable\b/gi,
  /\bnot marked complete\b/gi,
  /\bclient-facing work\b/gi,
  /\bretainer work\b/gi,
  /\bnext:\s/gi,
];

function normalizeStatus(value: unknown): ClientFacingWorkStatus | null {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (!raw) return null;
  if (raw === "complete" || raw === "completed") return "complete";
  if (raw === "in-progress" || raw === "in progress") return "in-progress";
  if (
    raw === "waiting-on-client" ||
    raw === "waiting on client" ||
    raw === "waiting on you" ||
    raw === "awaiting-client"
  ) {
    return "waiting-on-client";
  }
  if (raw === "blocked") return "blocked";
  if (raw === "not-started" || raw === "not started") return "not-started";
  return null;
}

function statusFromSummaryPrefix(summary: string): ClientFacingWorkStatus | null {
  const head = summary.trim().split(/[—–\-:]/)[0]?.trim().toLowerCase() ?? "";
  return normalizeStatus(head);
}

/**
 * Strip operator workflow language and keep a short client-safe explanation.
 */
export function sanitizeClientFacingWorkSummary(
  summary: unknown,
  options?: { status?: ClientFacingWorkStatus | null; maxLen?: number },
): string {
  let text = stripClientFacingOperatorLeaks(summary, options?.maxLen ?? 400);
  if (!text) return "";

  // Drop leading status labels — status is rendered separately.
  text = text.replace(
    /^(?:completed|complete|in progress|in-progress|waiting on (?:you|client)|waiting-on-client|blocked|not started|not-started)\s*[—–\-:]\s*/i,
    "",
  );

  for (const pattern of INTERNAL_WORK_SUMMARY_PATTERNS) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, " ").trim();
  }

  // Collapse leftover punctuation / whitespace after removals.
  text = text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[—–\-]\s+/g, " — ")
    .replace(/[—–\-]\s*$/g, "")
    .replace(/^\s*[—–\-]\s*/g, "")
    .trim();

  // If the remainder still looks like a long operator dump, keep only the first sentence.
  if (text.length > 220) {
    const firstSentence = text.match(/^[^.!?]+[.!?]?/)?.[0]?.trim();
    text = firstSentence && firstSentence.length >= 24 ? firstSentence : text.slice(0, 200).trim();
    if (text.length >= 200 && !/[.!?]$/.test(text)) text = `${text}…`;
  }

  return sanitizeReportText(text, options?.maxLen ?? 280);
}

export function workStatusLabel(status: ClientFacingWorkStatus | null | undefined): string | null {
  if (!status) return null;
  return STATUS_LABEL[status] ?? null;
}

export function resolveWorkStatus(item: {
  status?: string | null;
  summary?: string | null;
  completedAt?: string | null;
}): ClientFacingWorkStatus | null {
  const explicit = normalizeStatus(item.status);
  if (explicit) return explicit;
  const fromSummary = statusFromSummaryPrefix(String(item.summary ?? ""));
  if (fromSummary) return fromSummary;
  if (item.completedAt) return "complete";
  return null;
}

/**
 * Normalize a selected work item for client-facing snapshot/PDF/HTML.
 */
export function toClientFacingWorkItem(item: CompletedWorkItem): CompletedWorkItem {
  const status = resolveWorkStatus(item);
  const summary = sanitizeClientFacingWorkSummary(item.summary, { status });
  return {
    id: String(item.id),
    title: sanitizeReportText(item.title, 300),
    summary,
    completedAt: item.completedAt ? String(item.completedAt).slice(0, 10) : null,
    source: String(item.source ?? "activity"),
    clientVisible: item.clientVisible !== false,
    included: item.included !== false,
    status: status ?? null,
  };
}

export function groupClientFacingWorkItems(items: CompletedWorkItem[]): Array<{
  status: ClientFacingWorkStatus | "other";
  label: string;
  items: CompletedWorkItem[];
}> {
  const order: Array<ClientFacingWorkStatus | "other"> = [
    "waiting-on-client",
    "in-progress",
    "complete",
    "blocked",
    "not-started",
    "other",
  ];
  const buckets = new Map<ClientFacingWorkStatus | "other", CompletedWorkItem[]>();
  for (const key of order) buckets.set(key, []);

  for (const item of items) {
    const status = resolveWorkStatus(item) ?? "other";
    buckets.get(status === "other" ? "other" : status)!.push(item);
  }

  return order
    .map((status) => ({
      status,
      label:
        status === "other"
          ? "Work"
          : workStatusLabel(status as ClientFacingWorkStatus) ?? "Work",
      items: buckets.get(status) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}
