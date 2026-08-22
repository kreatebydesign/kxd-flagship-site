/**
 * Client-safe commercial document filtering and download paths.
 */

import type { CommercialDocumentKindLabel } from "@/lib/client-command/commercial/types";
import { documentKindLabel } from "@/lib/client-command/commercial/map-agreement";

/** Kinds safe to expose in the client portal. */
export const CLIENT_SAFE_COMMERCIAL_DOCUMENT_KINDS = new Set([
  "executed-contract",
  "certificate",
  "accepted-proposal",
  "billing-summary",
  "receipt",
]);

export function isClientSafeCommercialDocumentKind(kind: string): boolean {
  return CLIENT_SAFE_COMMERCIAL_DOCUMENT_KINDS.has(kind);
}

export function portalCommercialDocumentDownloadHref(documentId: number): string {
  return `/api/portal/commercial-documents/${documentId}/download`;
}

export function mapClientSafeCommercialDocument(input: {
  id: number;
  kind: string;
  title: string;
}): {
  id: number;
  title: string;
  kindLabel: CommercialDocumentKindLabel;
  downloadHref: string;
} | null {
  if (!isClientSafeCommercialDocumentKind(input.kind)) return null;
  return {
    id: input.id,
    title: input.title,
    kindLabel: documentKindLabel(input.kind),
    downloadHref: portalCommercialDocumentDownloadHref(input.id),
  };
}
