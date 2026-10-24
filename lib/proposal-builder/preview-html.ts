import "server-only";

import { renderProposalPreviewHtml } from "./export-html.ts";
import { getProposal, previewCanonical } from "./services.ts";

/**
 * Operator-facing proposal HTML (canonical, no internal fields).
 * Shared by the preview API route and production regression scripts.
 */
export async function getProposalPreviewHtmlForOperator(
  id: number,
): Promise<string | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const proposal = await getProposal(id);
  if (!proposal) return null;
  const canonical = previewCanonical(proposal);
  return renderProposalPreviewHtml(canonical);
}
