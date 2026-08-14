/**
 * Portal-safe report HTML embedding.
 *
 * Stored exports are full HTML documents. Injecting them via innerHTML drops
 * <body> semantics, so body-scoped colors never apply and portal theme
 * inheritance can produce unreadable near-black-on-black text.
 */

const BODY_CONTENT_RE = /<body[^>]*>([\s\S]*)<\/body>/i;
const HEAD_RE = /<head[\s\S]*?<\/head>/i;
const DOCTYPE_RE = /<!DOCTYPE[^>]*>/i;

/** Extract renderable markup from a full report HTML document or fragment. */
export function extractReportDocumentBody(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const bodyMatch = trimmed.match(BODY_CONTENT_RE);
  if (bodyMatch?.[1]) return bodyMatch[1].trim();

  if (!DOCTYPE_RE.test(trimmed) && !/^<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(DOCTYPE_RE, "")
    .replace(HEAD_RE, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
}

/** Wrap extracted report markup for isolated portal presentation. */
export function preparePortalReportEmbedHtml(html: string): string {
  const body = extractReportDocumentBody(html);
  if (!body) return "";
  return `<div class="kxd-report-portal-root" data-kxd-report-embed="true">${body}</div>`;
}

/** Pick the best stored HTML field for portal rendering. */
export function resolvePortalReportHtmlSource(input: {
  portalHtml?: string | null;
  htmlExport?: string | null;
}): string {
  const portal = String(input.portalHtml ?? "").trim();
  if (portal) return portal;
  return String(input.htmlExport ?? "").trim();
}
