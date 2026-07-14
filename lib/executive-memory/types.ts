/**
 * Phase 32A / 32A.1 — Executive Memory (Shared Core).
 *
 * Outward-facing, per-client relationship memory for Executive Performance
 * and Executive Client Briefing. Distinct from lib/business-memory/ (KXD studio inward).
 *
 * Facts only — completed / active / in-progress / planned work.
 * Never invent history. Never AI-generate.
 */

export type ExecutiveMemoryKind =
  | "identity"
  | "relationship"
  | "delivery"
  | "system"
  | "marketing"
  | "seo"
  | "advertising"
  | "website"
  | "automation"
  | "portal"
  | "reporting"
  | "milestone"
  | "launch"
  | "priority"
  | "opportunity"
  | "platform";

/** Lifecycle of a remembered partnership fact. */
export type ExecutiveMemoryStatus =
  | "completed"
  | "active"
  | "in-progress"
  | "planned";

/**
 * How strongly this memory is backed outside the config file itself.
 * Briefing uses this to avoid overstating; EP presentation bridges stay stable.
 */
export type ExecutiveMemoryEvidenceStrength =
  | "verified"
  | "supported"
  | "editorial"
  | "insufficient";

/** Which briefing band this item belongs to (or hidden from briefing). */
export type ExecutiveBriefingSectionId =
  | "built"
  | "systems"
  | "marketing"
  | "current"
  | "awaiting"
  | "results"
  | "next"
  | "platform"
  | "hidden";

export type ExecutiveAwaitingOwner = "kxd" | "client";

/** Configurable platform expansion (e.g. Primal OS) — never implies purchased. */
export type ExecutivePlatformOpportunity = {
  title: string;
  positioning: string;
  capabilities: string[];
  pricing: {
    /** When no approved amounts exist in a trusted source. */
    mode: "prepared-separately" | "configured";
    models: Array<{
      id: string;
      label: string;
      /** Null unless an approved amount exists in configuration. */
      amountLabel: string | null;
    }>;
    note: string;
  };
};

/**
 * One structured executive memory object.
 * `statement` is client-safe hospitality language backed by real work.
 */
export type ExecutiveMemoryItem = {
  id: string;
  kind: ExecutiveMemoryKind;
  status: ExecutiveMemoryStatus;
  /** Short editorial label for lists / beats. */
  label: string;
  /** Full client-facing sentence (EP-safe when used as partnership detail). */
  statement: string;
  /** Optional briefing-only honesty line when EP partnership copy stays unchanged. */
  briefingStatement?: string;
  /** ISO date when known; null when only sequence is known. */
  occurredAt: string | null;
  /** Evidence tags for later verification (project ids, systems, periods). */
  evidenceLabels: string[];
  evidenceStrength: ExecutiveMemoryEvidenceStrength;
  /** Prefer in EP progress strips when true. */
  priority?: boolean;
  awaitingOwner?: ExecutiveAwaitingOwner;
  briefingSection?: ExecutiveBriefingSectionId;
  platformOpportunity?: ExecutivePlatformOpportunity;
  /**
   * Optional EP presentation bridges — when set, partnership-value / milestones
   * can reuse memory without duplicating prose.
   */
  presentation?: {
    partnershipItemId?: string;
    milestoneId?: string;
    /** When milestone list copy differs from partnership / story label. */
    milestoneLabel?: string;
    storyBeatId?: string;
    evolutionId?: string;
  };
};

export type ExecutiveMemoryLens = {
  clientSlug: string;
  clientName: string;
  /** Ordered memory — chronological when dates exist; otherwise curated. */
  items: ExecutiveMemoryItem[];
  /** Human note on how this lens was authored (config vs future CMS). */
  source: "configuration" | "composed";
};

export type ExecutiveMemorySlice = {
  clientSlug: string;
  completed: ExecutiveMemoryItem[];
  active: ExecutiveMemoryItem[];
  inProgress: ExecutiveMemoryItem[];
  planned: ExecutiveMemoryItem[];
  story: ExecutiveMemoryItem[];
};
