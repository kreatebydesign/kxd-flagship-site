/**
 * Browser local recovery for Proposal Builder drafts.
 * Scoped by operator email + proposal id. Never stores auth secrets.
 */

import type { ProposalDocument } from "./types.ts";

export const PROPOSAL_DRAFT_RECOVERY_VERSION = 1 as const;

export type ProposalDraftRecoveryPayload = {
  version: typeof PROPOSAL_DRAFT_RECOVERY_VERSION;
  operatorEmail: string;
  proposalId: number | "new";
  savedAt: string;
  title: string;
  leadId: number | "";
  clientId: number | "";
  proposalDate: string;
  expiresAt: string;
  internalOwner: string;
  templateKind: string;
  document: ProposalDocument;
};

function storageKey(operatorEmail: string, proposalId: number | "new"): string {
  const op = operatorEmail.trim().toLowerCase() || "unknown";
  return `kxd.proposal-builder.recovery.v${PROPOSAL_DRAFT_RECOVERY_VERSION}:${op}:${proposalId}`;
}

export function writeProposalDraftRecovery(
  payload: ProposalDraftRecoveryPayload,
): void {
  if (typeof window === "undefined") return;
  try {
    const key = storageKey(payload.operatorEmail, payload.proposalId);
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function readProposalDraftRecovery(
  operatorEmail: string,
  proposalId: number | "new",
): ProposalDraftRecoveryPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(operatorEmail, proposalId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProposalDraftRecoveryPayload;
    if (parsed?.version !== PROPOSAL_DRAFT_RECOVERY_VERSION) return null;
    if (
      String(parsed.operatorEmail || "")
        .trim()
        .toLowerCase() !== operatorEmail.trim().toLowerCase()
    ) {
      return null;
    }
    if (String(parsed.proposalId) !== String(proposalId)) return null;
    if (!parsed.document || typeof parsed.document !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProposalDraftRecovery(
  operatorEmail: string,
  proposalId: number | "new",
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(operatorEmail, proposalId));
    // Also clear the "new" slot after first server save when navigating to an id.
    if (proposalId !== "new") {
      window.localStorage.removeItem(storageKey(operatorEmail, "new"));
    }
  } catch {
    /* ignore */
  }
}
