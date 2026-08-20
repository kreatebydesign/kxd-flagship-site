/**
 * Client-facing contract body sanitization.
 * Internal draft banners stay in stored/operator views; signing + PDF use this.
 */

import {
  DEFAULT_LEGAL_DRAFT_NOTICE,
  DEFAULT_OPERATIONAL_DRAFT_NOTICE,
} from "../proposal-builder/types.ts";

const INTERNAL_BANNER_PATTERNS: RegExp[] = [
  /^DRAFT FOR INTERNAL REVIEW[^\n]*/gim,
  /^AUTO-GENERATED DRAFT[^\n]*/gim,
  /^Template and operational wording only\.[^\n]*/gim,
];

/** Exact known notices that must never appear in client signing / executed PDFs. */
const EXACT_INTERNAL_NOTICES = [
  DEFAULT_LEGAL_DRAFT_NOTICE,
  DEFAULT_OPERATIONAL_DRAFT_NOTICE,
  "AUTO-GENERATED DRAFT — internal review required. Not attorney-approved. Not sent.",
  "AUTO-GENERATED DRAFT — internal review required. Not sent.",
];

/**
 * Strip internal-only draft banners from agreement text for client-facing surfaces.
 * Does not remove commercial/legal provisions.
 */
export function toClientFacingContractBody(body: string | null | undefined): string {
  let text = String(body ?? "");
  for (const notice of EXACT_INTERNAL_NOTICES) {
    text = text.split(notice).join("");
  }
  for (const pattern of INTERNAL_BANNER_PATTERNS) {
    text = text.replace(pattern, "");
  }
  // Collapse leading blank lines created by banner removal.
  text = text.replace(/^\s*\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

export function containsInternalDraftBanner(body: string | null | undefined): boolean {
  const text = String(body ?? "");
  if (!text.trim()) return false;
  if (EXACT_INTERNAL_NOTICES.some((n) => text.includes(n))) return true;
  return INTERNAL_BANNER_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(text);
  });
}
