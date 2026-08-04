/**
 * Update Engine design (P0-B Workstream 9).
 *
 * Separates:
 * - Automatic — machine-derived facts from repo/runtime
 * - Generated Draft — agent draft requiring human confirmation
 * - Manual Approval — human-authored meaning
 * - Protected — cannot change automatically (Doctrine, Product DNA, Vision)
 *
 * This module defines the contract for how future updates occur.
 * It does not execute updates in P0-B.
 */

import type {
  ProductIntelligenceObjectType,
  UpdateChannel,
} from "./primitives";
import { UPDATE_CHANNELS } from "./primitives";
import type { IntelligenceVersionRecord } from "./versioning";

export type { UpdateChannel };
export { UPDATE_CHANNELS };

/**
 * Object types that cannot change automatically.
 * Product DNA is harder to change than Doctrine; both remain protected.
 */
export const PROTECTED_OBJECT_TYPES = [
  "product_dna",
  "doctrine",
  "vision",
] as const satisfies readonly ProductIntelligenceObjectType[];

export type ProtectedObjectType = (typeof PROTECTED_OBJECT_TYPES)[number];

/** Default update channel by object type (contracts foundation). */
export const DEFAULT_UPDATE_CHANNEL_BY_TYPE: Record<
  ProductIntelligenceObjectType,
  UpdateChannel
> = {
  product_dna: "protected",
  doctrine: "protected",
  vision: "protected",
  product_inventory: "generated_draft",
  architecture: "manual_approval",
  experience: "manual_approval",
  design_system: "manual_approval",
  evidence: "automatic",
  decision: "manual_approval",
  founder_friction: "generated_draft",
  competitive_insight: "generated_draft",
  roadmap_item: "manual_approval",
  technical_debt: "generated_draft",
  release: "automatic",
  product_evolution: "manual_approval",
  score: "generated_draft",
  valuation: "manual_approval",
  health_snapshot: "generated_draft",
  hall_of_fame: "manual_approval",
  product_kill_list: "manual_approval",
  future_bet: "manual_approval",
};

export type UpdateProposalStatus =
  | "proposed"
  | "draft_ready"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "applied"
  | "blocked_protected";

/**
 * Proposed mutation against a Product Intelligence object.
 * Automatic facts may apply when channel allows; meaning requires approval.
 */
export interface IntelligenceUpdateProposal {
  id: string;
  objectId: string;
  objectType: ProductIntelligenceObjectType;
  channel: UpdateChannel;
  status: UpdateProposalStatus;
  /** Structured patch description — not applied content population. */
  proposedDeltaSummary: string;
  createdAt: string;
  createdBy: string;
  generatedBy: "human" | "agent" | "system";
  requiresHumanApproval: boolean;
  /** Version record to append if/when applied. */
  versionDraft: Omit<
    IntelligenceVersionRecord,
    "humanApproved" | "approvedBy"
  > | null;
}

export interface UpdateEnginePolicy {
  schemaVersion: "P0-B";
  protectedObjectTypes: readonly ProtectedObjectType[];
  defaultChannelByType: typeof DEFAULT_UPDATE_CHANNEL_BY_TYPE;
  /** Auto may assert what exists. Auto may draft meaning. Auto may not change protected meaning. */
  laws: readonly string[];
}

export const UPDATE_ENGINE_POLICY: UpdateEnginePolicy = {
  schemaVersion: "P0-B",
  protectedObjectTypes: PROTECTED_OBJECT_TYPES,
  defaultChannelByType: DEFAULT_UPDATE_CHANNEL_BY_TYPE,
  laws: [
    "Automatic updates may assert facts from reality (code, commits, verifiers, releases).",
    "Generated drafts may propose meaning but require human confirmation before apply.",
    "Manual approval is required for decisions, valuation assumptions, and roadmap authorization.",
    "Doctrine, Product DNA, and Vision cannot change automatically.",
    "Product DNA is harder to change than Doctrine — treat DNA mutations as exceptional founder acts.",
    "Future Bets never become roadmap automatically.",
    "Kill List entries never resurrect automatically.",
  ],
};

export function isProtectedObjectType(
  type: ProductIntelligenceObjectType,
): type is ProtectedObjectType {
  return (PROTECTED_OBJECT_TYPES as readonly string[]).includes(type);
}

/**
 * Resolve whether a proposed channel is legal for an object type.
 * Protected types reject automatic and generated_draft apply paths.
 */
export function assertUpdateChannelAllowed(
  objectType: ProductIntelligenceObjectType,
  channel: UpdateChannel,
): { allowed: boolean; reason: string } {
  if (isProtectedObjectType(objectType)) {
    if (channel === "automatic" || channel === "generated_draft") {
      return {
        allowed: false,
        reason: `${objectType} is protected and cannot change via ${channel}.`,
      };
    }
    if (channel !== "protected" && channel !== "manual_approval") {
      return {
        allowed: false,
        reason: `${objectType} only accepts protected or manual_approval channels.`,
      };
    }
  }
  if (!(UPDATE_CHANNELS as readonly string[]).includes(channel)) {
    return { allowed: false, reason: `Unknown update channel: ${channel}` };
  }
  return { allowed: true, reason: "ok" };
}

export function createEmptyUpdateProposalStore(): IntelligenceUpdateProposal[] {
  return [];
}
