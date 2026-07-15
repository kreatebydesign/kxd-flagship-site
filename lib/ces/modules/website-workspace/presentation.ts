/** Client-safe helpers for Website Workspace request presentation. */

export function formatWorkspaceSubmitter(input: {
  requestedBy?: string | null;
  notesPreview?: string | null;
  requestDetails?: string | null;
}): string {
  const named = input.requestedBy?.trim();
  if (named) return named;

  const haystack = `${input.notesPreview ?? ""}\n${input.requestDetails ?? ""}`;
  if (/Phase 34D schema verification/i.test(haystack)) {
    return "KXD test";
  }

  return "Unknown";
}

export function formatWorkspaceSubmittedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatWorkspaceRequestRef(id: number): string {
  return `WS-${String(id).padStart(4, "0")}`;
}
