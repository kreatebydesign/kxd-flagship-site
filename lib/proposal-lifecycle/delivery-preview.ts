/**
 * Local/simulated delivery only — never sends real email from this module.
 * Persisted previews store redacted URLs only (no raw capability tokens).
 */

import { newLifecycleId } from "./hash.ts";
import { redactSecureUrl, scrubTokenFromText } from "./token-redaction.ts";
import type { LocalDeliveryPreview } from "./types.ts";

export function buildLocalDeliveryPreview(input: {
  kind: LocalDeliveryPreview["kind"];
  recipientName: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  templateVersion?: string;
  /** Full one-time URL — redacted before persistence. */
  secureUrl: string;
  /** Raw token to scrub from body text/html when present. */
  rawToken?: string;
  createdBy?: string | null;
  relatedProposalId?: number | null;
  relatedContractId?: number | null;
  version?: number | null;
  snapshotHash?: string | null;
}): LocalDeliveryPreview {
  const raw = input.rawToken ?? "";
  const redactedUrl = redactSecureUrl(input.secureUrl);
  let bodyText = input.bodyText.trim();
  let bodyHtml = input.bodyHtml;
  if (raw) {
    bodyText = scrubTokenFromText(bodyText, raw);
    if (bodyHtml) bodyHtml = scrubTokenFromText(bodyHtml, raw);
  } else {
    bodyText = scrubTokenFromText(bodyText, extractTokenHint(input.secureUrl));
    if (bodyHtml) bodyHtml = scrubTokenFromText(bodyHtml, extractTokenHint(input.secureUrl));
  }
  return {
    id: newLifecycleId("delivery"),
    mode: "local-simulated",
    label: "SIMULATED LOCAL DELIVERY — not sent",
    kind: input.kind,
    templateVersion: input.templateVersion ?? null,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy ?? null,
    recipientName: input.recipientName.trim(),
    recipientEmail: input.recipientEmail.trim().toLowerCase(),
    subject: input.subject.trim(),
    bodyText,
    bodyHtml,
    secureUrl: redactedUrl,
    relatedProposalId: input.relatedProposalId ?? null,
    relatedContractId: input.relatedContractId ?? null,
    version: input.version ?? null,
    snapshotHash: input.snapshotHash ?? null,
  };
}

function extractTokenHint(secureUrl: string): string {
  try {
    const parts = new URL(secureUrl).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    return "";
  }
}

export function formatDeliveryPreviewLog(preview: LocalDeliveryPreview): string {
  return [
    preview.label,
    `Kind: ${preview.kind}`,
    `To: ${preview.recipientName} <${preview.recipientEmail}>`,
    `Subject: ${preview.subject}`,
    `Secure URL (redacted): ${preview.secureUrl}`,
    "",
    preview.bodyText,
  ].join("\n");
}
