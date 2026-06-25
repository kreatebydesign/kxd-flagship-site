/** Shared KXD operations workspace tokens — matches existing ops pages. */
export const WORKSPACE_C = {
  bgBase: "#080808",
  bgElevated: "#0B0B0B",
  bgCard: "#101010",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  red: "#d25a5a",
  yellow: "#E8C468",
  teal: "#A8B4C8",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

export const WORKSPACE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "projects", label: "Projects" },
  { id: "services", label: "Services" },
  { id: "technical", label: "Technical" },
  { id: "marketing", label: "Marketing" },
  { id: "revenue", label: "Revenue" },
  { id: "opportunities", label: "Opportunities" },
  { id: "roadmap", label: "Roadmap" },
  { id: "notes", label: "Notes" },
] as const;

export type WorkspaceTabId = (typeof WORKSPACE_TABS)[number]["id"];

export function isWorkspaceTabId(value: string | undefined): value is WorkspaceTabId {
  return WORKSPACE_TABS.some((t) => t.id === value);
}

export function fmtWorkspaceDate(iso: string | null | undefined): string {
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

export function splitLines(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
