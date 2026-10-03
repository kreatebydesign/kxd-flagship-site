/**
 * Client Command — portal-safe lifecycle action wrapper (Primal Phase 1, Build 1).
 *
 * Every action goes through `updateClientInquiryLifecycle` with `requireTenant`
 * (hard tenant isolation) and a resolved registry/generic policy. Client
 * Command deliberately never sets verificationState, assignedOwnerId (staff),
 * confirmedSaleReference, reconciliationState, or googleConversionObserved —
 * those stay operator-only via Shared Core / admin operations.
 */

import "server-only";

import {
  updateClientInquiryLifecycle,
  type UpdateClientInquiryLifecycleInput,
  type UpdateClientInquiryLifecycleResult,
} from "@/lib/managed-client-leads/update-lifecycle";
import type { ManagedClientLeadPolicy } from "@/lib/acquisition-operations/policy";
import type { LostReason } from "@/lib/managed-client-leads/types";
import { applyLeadPresentationStage } from "./apply-stage";
import type { LeadCommandTenantContext, LeadPresentationStage } from "./types";

export type LeadCommandAction =
  | { type: "assign"; portalOwnerId: number | null }
  | { type: "stage"; stage: LeadPresentationStage }
  | { type: "note"; note: string }
  | { type: "follow-up"; nextFollowUpAt: string | null }
  | { type: "qualify" }
  | { type: "won"; wonRevenueCents?: number | null; bookedProgram?: string | null }
  | { type: "lost"; lostReason: LostReason };

type LeadActionPatch = Omit<
  UpdateClientInquiryLifecycleInput,
  "inquiryId" | "actorUserId" | "policyOverride" | "requireTenant"
>;

function buildPatchForAction(action: LeadCommandAction): LeadActionPatch {
  switch (action.type) {
    case "assign":
      return { assignedPortalOwnerId: action.portalOwnerId };
    case "stage":
      return applyLeadPresentationStage(action.stage);
    case "note":
      return { operatorNotes: action.note };
    case "follow-up":
      return { nextFollowUpAt: action.nextFollowUpAt };
    case "qualify":
      return { qualificationState: "qualified" };
    case "won":
      return {
        operationalStatus: "closed",
        outcomeState: "won",
        wonRevenueCents: action.wonRevenueCents ?? null,
        bookedProgram: action.bookedProgram ?? null,
      };
    case "lost":
      return {
        operationalStatus: "closed",
        outcomeState: "lost",
        lostReason: action.lostReason,
      };
    default:
      return {};
  }
}

export async function applyLeadCommandAction(input: {
  inquiryId: number;
  tenant: LeadCommandTenantContext;
  policy: ManagedClientLeadPolicy;
  actorId: number;
  action: LeadCommandAction;
}): Promise<UpdateClientInquiryLifecycleResult> {
  if (
    input.action.type === "won" &&
    input.action.wonRevenueCents != null &&
    (!Number.isFinite(input.action.wonRevenueCents) || input.action.wonRevenueCents < 0)
  ) {
    return {
      ok: false,
      code: "error",
      message: "Revenue must be a non-negative amount.",
    };
  }

  const patch = buildPatchForAction(input.action);
  return updateClientInquiryLifecycle({
    inquiryId: input.inquiryId,
    actorUserId: input.actorId,
    policyOverride: input.policy,
    requireTenant: { clientId: input.tenant.clientId, clientKey: input.tenant.clientKey },
    ...patch,
  });
}
