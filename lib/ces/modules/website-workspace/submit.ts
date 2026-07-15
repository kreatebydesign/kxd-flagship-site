import type { WebsiteWorkspaceSectionContent, WebsiteWorkspaceUpdateContext } from "./types";

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export function buildWebsiteWorkspaceTitle(
  pageTitle: string,
  sectionTitle: string,
): string {
  return `${pageTitle} · ${sectionTitle}`;
}

export function formatWebsiteWorkspaceRequestDetails(
  context: WebsiteWorkspaceUpdateContext,
): string {
  const lines = [
    "Update type: Website Workspace",
    "",
    `Page: ${context.pageTitle}`,
    `Section: ${context.sectionTitle}`,
    `Path: ${context.pagePath}`,
    "",
    "— Current content —",
    `Heading: ${clean(context.current.heading) || "—"}`,
    `Body: ${clean(context.current.body) || "—"}`,
    `CTA: ${clean(context.current.cta) || "—"}`,
    `Image: ${context.current.imageUrl || "—"}`,
    "",
    "— Requested changes —",
    `Heading: ${clean(context.requested.heading) || "(no change)"}`,
    `Body: ${clean(context.requested.body) || "(no change)"}`,
    `CTA: ${clean(context.requested.cta) || "(no change)"}`,
    "",
    "— Notes —",
    clean(context.notes) || "—",
  ];

  return lines.join("\n");
}

export function hasRequestedContent(requested: WebsiteWorkspaceSectionContent): boolean {
  return Boolean(
    clean(requested.heading) || clean(requested.body) || clean(requested.cta),
  );
}

export function notesPreviewFromDetails(details: string): string {
  const marker = "— Notes —";
  const index = details.indexOf(marker);
  const raw =
    index >= 0
      ? details.slice(index + marker.length).trim()
      : details.slice(0, 160).trim();
  if (!raw || raw === "—") return "";
  return raw.length > 160 ? `${raw.slice(0, 160).trim()}…` : raw;
}
