export function fmtPortalDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function projectProgress(status: string | null | undefined): number {
  const map: Record<string, number> = {
    planning: 15,
    active: 55,
    "waiting-on-client": 40,
    review: 75,
    launched: 100,
    paused: 30,
    archived: 100,
  };
  return map[status ?? ""] ?? 20;
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return status
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const PROJECT_STATUS_COLOR: Record<string, string> = {
  planning: "rgba(138,155,210,0.9)",
  active: "rgba(94,198,140,0.9)",
  "waiting-on-client": "rgba(240,190,80,0.9)",
  review: "rgba(197,166,92,0.9)",
  launched: "rgba(94,198,140,0.9)",
  paused: "rgba(191,183,170,0.7)",
  archived: "rgba(255,255,255,0.35)",
};

export const REQUEST_STATUS_COLOR: Record<string, string> = {
  new: "rgba(138,155,210,0.9)",
  triaged: "rgba(197,166,92,0.9)",
  "in-progress": "rgba(94,198,140,0.9)",
  "waiting-on-client": "rgba(240,190,80,0.9)",
  complete: "rgba(94,198,140,0.9)",
  declined: "rgba(210,90,90,0.9)",
};

export const DELIVERABLE_STATUS_COLOR: Record<string, string> = {
  "not-started": "rgba(255,255,255,0.35)",
  "in-progress": "rgba(94,198,140,0.9)",
  "waiting-on-client": "rgba(240,190,80,0.9)",
  complete: "rgba(94,198,140,0.9)",
  blocked: "rgba(210,90,90,0.9)",
};
