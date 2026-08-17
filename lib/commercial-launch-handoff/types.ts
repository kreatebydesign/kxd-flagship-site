/**
 * Commercial → Client Launch Handoff V0 — shared types.
 * Reuses modern commercial lifecycle + Launch Wizard + Portal Access invitations.
 */

import type { LaunchWizardDraftPayload } from "@/lib/client-launch-wizard/types";

export type CommercialLaunchHandoffSource = {
  contractId: number;
  proposalId: number | null;
  /** Existing client linked on the contract (prospect or prior). */
  sourceClientId: number | null;
  /** When true, Launch Wizard must reuse sourceClientId — never create another. */
  reuseExistingClient: boolean;
};

export type LaunchInvitationOutcome = {
  email: string;
  role: "owner" | "collaborator" | "viewer";
  invitationId: number | null;
  status:
    | "ready-to-invite"
    | "sending"
    | "invitation-sent"
    | "invitation-delivery-failed"
    | "already-invited"
    | "access-active"
    | "skipped";
  emailSent: boolean;
  message: string;
  activateUrlForDev?: string;
};

export type CommercialLaunchHandoffState = {
  draftId: string | number | null;
  launchedClientId: number | null;
  launchedAt: string | null;
  invitationIds: number[];
  lastInvitationOutcomes?: LaunchInvitationOutcome[];
};

export type StartCommercialLaunchHandoffResult =
  | {
      ok: true;
      draftId: string | number;
      launchWizardUrl: string;
      reusedExistingDraft: boolean;
      alreadyLaunched: boolean;
      launchedClientId: number | null;
      prefill: LaunchWizardDraftPayload;
      warnings: string[];
    }
  | {
      ok: false;
      code: string;
      message: string;
    };
