/**
 * Propose included capabilities from commercial engagement evidence.
 *
 * Pure / deterministic. Does not mutate pricing, obligations, payments, or
 * accepted snapshots. Operator must review before apply.
 */
import type { ServiceCapabilityId } from "./types";
import { isServiceCapabilityId } from "./catalog";
import { slugifyServiceKey } from "@/lib/proposal-lifecycle/ensure-payable-surfaces";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";

export type CapabilityMappingConfidence = "high" | "medium" | "needs-review";

export type ProposedCapabilityMapping = {
  capabilityId: ServiceCapabilityId;
  confidence: CapabilityMappingConfidence;
  rationale: string;
  evidence: string[];
  relatedContractId: number | null;
  /** Bridge materialization must not drive portal modules by itself. */
  drivesExperience: false;
  suggestedSource: "agreement" | "included";
};

export type EngagementCapabilityProposal = {
  clientId: number;
  proposals: ProposedCapabilityMapping[];
  skipped: Array<{ reason: string; evidence: string }>;
  warnings: string[];
};

type EvidenceBlob = {
  contractId: number | null;
  texts: string[];
};

function pushText(out: string[], value: unknown) {
  if (typeof value === "string" && value.trim()) out.push(value.trim());
  else if (Array.isArray(value)) {
    for (const item of value) pushText(out, item);
  }
}

function collectPackageEvidence(
  contractId: number,
  pkgRaw: unknown,
): EvidenceBlob {
  const pkg = normalizeLifecyclePackage(pkgRaw);
  const texts: string[] = [];

  const terms = pkg.structuredPaymentTerms;
  if (terms?.recurring) {
    pushText(texts, terms.recurring.serviceTitle);
    pushText(texts, terms.recurring.includes);
    pushText(texts, terms.recurring.status);
  }
  for (const charge of terms?.ancillaryCharges ?? []) {
    pushText(texts, charge.title);
    pushText(texts, charge.termNotes);
    pushText(texts, charge.renewalNotes);
  }
  const amendment = pkg.commercialAmendments?.recurringService;
  if (amendment) {
    pushText(texts, amendment.title);
    pushText(texts, amendment.includes);
  }
  for (const charge of pkg.commercialAmendments?.ancillaryCharges ?? []) {
    pushText(texts, charge.title);
    pushText(texts, charge.termNotes);
    pushText(texts, charge.renewalNotes);
  }
  for (const def of pkg.operatorRecurringServices ?? []) {
    pushText(texts, def.title);
    pushText(texts, def.description);
    pushText(texts, def.serviceKey);
  }
  for (const obl of pkg.billingPlan?.obligations ?? []) {
    pushText(texts, obl.label);
    pushText(texts, obl.serviceTitle);
    pushText(texts, obl.serviceDescription);
    pushText(texts, obl.kind);
    pushText(texts, obl.sourceKey);
  }

  return { contractId, texts };
}

function haystack(blobs: EvidenceBlob[]): string {
  return blobs
    .flatMap((b) => b.texts)
    .join("\n")
    .toLowerCase();
}

function evidenceHits(blobs: EvidenceBlob[], patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const blob of blobs) {
    for (const text of blob.texts) {
      const lower = text.toLowerCase();
      if (patterns.some((re) => re.test(lower))) {
        hits.push(text.slice(0, 160));
      }
    }
  }
  return [...new Set(hits)].slice(0, 8);
}

function primaryContractId(blobs: EvidenceBlob[], patterns: RegExp[]): number | null {
  for (const blob of blobs) {
    for (const text of blob.texts) {
      if (patterns.some((re) => re.test(text.toLowerCase()))) {
        return blob.contractId;
      }
    }
  }
  return blobs[0]?.contractId ?? null;
}

const MEDIA_VAULT_PATTERNS = [
  /\bmedia\s*vault\b/i,
  /\bkxd\s*media\s*vault\b/i,
  /\b250\s*g[i]?b\b/i,
];

const MANAGED_WEBSITE_PATTERNS = [
  /\bwebsite\s+growth\s*(?:&|and)\s*management\b/i,
  /\bwebsite\s+management\b/i,
  /\bmanaged\s+website\b/i,
  /\bwebsite\s+care\b/i,
  /\bwebsite\s+growth\b/i,
  /\bmanagement\s+fee\b/i,
];

const INVENTORY_PATTERNS = [
  /\binventory\b/i,
  /\bvehicle\s+listing\b/i,
  /\bshowroom\b/i,
];

/**
 * Propose capability mappings from engagement evidence.
 * Only returns capabilities with clean textual evidence.
 */
export function proposeCapabilitiesFromEngagement(input: {
  clientId: number;
  contracts: ReadonlyArray<{
    id: number;
    lifecyclePackage?: unknown;
    title?: unknown;
    projectName?: unknown;
  }>;
  /** Optional free-text relationship / commercial notes (operator-only). */
  commercialNotes?: string | null;
  relationshipLabel?: string | null;
  /** Already-active capability ids — proposals for these are omitted. */
  activeCapabilityIds?: readonly ServiceCapabilityId[];
}): EngagementCapabilityProposal {
  const blobs: EvidenceBlob[] = input.contracts.map((contract) => {
    const base = collectPackageEvidence(contract.id, contract.lifecyclePackage);
    pushText(base.texts, contract.title);
    pushText(base.texts, contract.projectName);
    return base;
  });
  if (input.commercialNotes?.trim()) {
    blobs.push({ contractId: null, texts: [input.commercialNotes.trim()] });
  }
  if (input.relationshipLabel?.trim()) {
    blobs.push({ contractId: null, texts: [input.relationshipLabel.trim()] });
  }

  const active = new Set(input.activeCapabilityIds ?? []);
  const proposals: ProposedCapabilityMapping[] = [];
  const skipped: EngagementCapabilityProposal["skipped"] = [];
  const warnings: string[] = [];
  const text = haystack(blobs);

  if (!text.trim()) {
    warnings.push("No commercial evidence texts found on contracts.");
    return { clientId: input.clientId, proposals, skipped, warnings };
  }

  const consider = (
    capabilityId: ServiceCapabilityId,
    patterns: RegExp[],
    rationale: string,
    confidence: CapabilityMappingConfidence,
  ) => {
    if (active.has(capabilityId)) {
      skipped.push({
        reason: `Already assigned: ${capabilityId}`,
        evidence: capabilityId,
      });
      return;
    }
    const hits = evidenceHits(blobs, patterns);
    if (hits.length === 0) return;
    if (!isServiceCapabilityId(capabilityId)) return;
    proposals.push({
      capabilityId,
      confidence,
      rationale,
      evidence: hits,
      relatedContractId: primaryContractId(blobs, patterns),
      drivesExperience: false,
      suggestedSource: "agreement",
    });
  };

  consider(
    "media_vault",
    MEDIA_VAULT_PATTERNS,
    "Commercial evidence references KXD Media Vault / storage allocation.",
    evidenceHits(blobs, [/\b250\s*g/i, /\bmedia\s*vault\b/i]).length >= 1
      ? "high"
      : "medium",
  );

  consider(
    "managed_website",
    MANAGED_WEBSITE_PATTERNS,
    "Commercial evidence references managed website / website management services.",
    evidenceHits(blobs, [/\bwebsite\s+growth\s*(?:&|and)\s*management\b/i, /\bmanaged\s+website\b/i])
      .length >= 1
      ? "high"
      : "medium",
  );

  // Inventory only when evidence is explicit — Primal showroom pattern.
  consider(
    "inventory_experience",
    INVENTORY_PATTERNS,
    "Commercial / relationship evidence references inventory / showroom experience.",
    "medium",
  );

  // Hosting as distinct annual line when clearly labeled (not website rebuild project).
  if (/\bmanaged\s+website\s+hosting\b/i.test(text) || /\bwebsite\s+hosting\b/i.test(text)) {
    consider(
      "hosting_infrastructure",
      [/\bmanaged\s+website\s+hosting\b/i, /\bwebsite\s+hosting\b/i],
      "Commercial evidence references website hosting as a distinct service.",
      "medium",
    );
  }

  return { clientId: input.clientId, proposals, skipped, warnings };
}

/** Stable note prefix for bridge-applied assignments (auditability). */
export const ENGAGEMENT_BRIDGE_NOTE_PREFIX = "mission-01-engagement-bridge:";

export function buildBridgeAssignmentNote(input: {
  capabilityId: ServiceCapabilityId;
  rationale: string;
  evidence: readonly string[];
}): string {
  const evidence = input.evidence
    .slice(0, 3)
    .map((e) => e.replace(/\s+/g, " ").trim())
    .join(" | ");
  return `${ENGAGEMENT_BRIDGE_NOTE_PREFIX} ${input.capabilityId} — ${input.rationale} Evidence: ${evidence}`.slice(
    0,
    900,
  );
}

export function serviceKeyLooksLikeMediaVault(serviceKeyOrTitle: string): boolean {
  const key = slugifyServiceKey(serviceKeyOrTitle);
  return key.includes("media-vault") || /\bmedia\s*vault\b/i.test(serviceKeyOrTitle);
}
