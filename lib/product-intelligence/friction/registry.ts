/**
 * Founder Friction registries — categories, severity, frequency, lifecycle (P0-F).
 */

import type {
  FrictionCategoryDefinition,
  FrictionFrequencyDefinition,
  FrictionLifecycleDefinition,
  FrictionLifecycleEdge,
  FrictionSeverityDefinition,
} from "./types";
import { FRICTION_LIFECYCLE_STATES } from "./types";

export const FRICTION_CATEGORY_DEFINITIONS: FrictionCategoryDefinition[] = [
  {
    id: "cognitive_load",
    title: "Cognitive Load",
    purpose: "Unnecessary thinking, scanning, or mental accounting to operate.",
  },
  {
    id: "navigation",
    title: "Navigation",
    purpose: "Difficulty finding the right place or competing home identities.",
  },
  {
    id: "workflow",
    title: "Workflow",
    purpose: "Broken or repetitive steps in completing an operational job.",
  },
  {
    id: "communication",
    title: "Communication",
    purpose: "Friction in messaging, handoffs, or notification noise.",
  },
  {
    id: "ai",
    title: "AI",
    purpose: "AI that creates chrome, hesitation, or chatbot gravity instead of assisting.",
  },
  {
    id: "automation",
    title: "Automation",
    purpose: "Missing, unsafe, or opaque automation that forces manual repetition.",
  },
  {
    id: "performance",
    title: "Performance",
    purpose: "Latency or reliability that breaks operating rhythm.",
  },
  {
    id: "mobile",
    title: "Mobile",
    purpose: "Mobile/operator-away friction that blocks essential actions.",
  },
  {
    id: "client_experience",
    title: "Client Experience",
    purpose: "Client-facing hesitation, confusion, or trust risk.",
  },
  {
    id: "founder_experience",
    title: "Founder Experience",
    purpose: "Founder morning/operating friction that reduces confidence.",
  },
  {
    id: "operational",
    title: "Operational",
    purpose: "Staff/ops friction in running the studio day to day.",
  },
  {
    id: "visual",
    title: "Visual",
    purpose: "Craft or hierarchy problems that create hesitation or noise.",
  },
  {
    id: "language",
    title: "Language",
    purpose: "Labels or copy that force reinterpretation or undermine calm.",
  },
  {
    id: "commercial",
    title: "Commercial",
    purpose: "Billing/agreements friction that blocks trust or completion.",
  },
  {
    id: "unknown",
    title: "Unknown",
    purpose: "Temporary bucket until category is verified — must be reclassified.",
  },
];

export const FRICTION_SEVERITY_DEFINITIONS: FrictionSeverityDefinition[] = [
  {
    id: "minor",
    title: "Minor",
    meaning: "Noticeable inconvenience; does not change operating decisions.",
  },
  {
    id: "moderate",
    title: "Moderate",
    meaning: "Recurring drag that slows work or creates avoidable re-checking.",
  },
  {
    id: "major",
    title: "Major",
    meaning: "Blocks an important workflow or forces significant workaround.",
  },
  {
    id: "critical",
    title: "Critical",
    meaning: "Threatens trust, client safety, or the ability to operate the OS.",
  },
];

export const FRICTION_FREQUENCY_DEFINITIONS: FrictionFrequencyDefinition[] = [
  {
    id: "once",
    title: "Once",
    meaning: "Observed a single time — still requires evidence.",
  },
  {
    id: "occasionally",
    title: "Occasionally",
    meaning: "Intermittent; not weekly rhythm.",
  },
  {
    id: "weekly",
    title: "Weekly",
    meaning: "Appears in normal weekly operating rhythm.",
  },
  {
    id: "daily",
    title: "Daily",
    meaning: "Appears in normal daily operating rhythm.",
  },
  {
    id: "constant",
    title: "Constant",
    meaning: "Present whenever the related surface is used.",
  },
];

export const FRICTION_LIFECYCLE_DEFINITIONS: FrictionLifecycleDefinition[] = [
  {
    id: "observed",
    title: "Observed",
    meaning: "Captured with evidence; not yet verified as recurring product friction.",
    terminal: false,
  },
  {
    id: "verified",
    title: "Verified",
    meaning: "Confirmed as real product friction (not a one-off bug ticket alone).",
    terminal: false,
  },
  {
    id: "accepted",
    title: "Accepted",
    meaning: "Acknowledged as valid friction; may remain without immediate build.",
    terminal: false,
  },
  {
    id: "planned",
    title: "Planned",
    meaning: "Linked to an authorized Decision/roadmap path — still not auto-build.",
    terminal: false,
  },
  {
    id: "in_progress",
    title: "In Progress",
    meaning: "Active authorized work is addressing the friction.",
    terminal: false,
  },
  {
    id: "resolved",
    title: "Resolved",
    meaning: "Addressed; learning record required.",
    terminal: true,
  },
  {
    id: "rejected",
    title: "Rejected",
    meaning: "Not product friction or intentionally not pursued; reason required.",
    terminal: true,
  },
  {
    id: "superseded",
    title: "Superseded",
    meaning: "Replaced by another friction/Decision; reason required.",
    terminal: true,
  },
];

/**
 * Allowed lifecycle edges. Every apply still requires a non-empty reason.
 */
export const FRICTION_ALLOWED_TRANSITIONS: FrictionLifecycleEdge[] = [
  { from: "observed", to: "verified" },
  { from: "observed", to: "rejected" },
  { from: "observed", to: "superseded" },
  { from: "verified", to: "accepted" },
  { from: "verified", to: "planned" },
  { from: "verified", to: "rejected" },
  { from: "verified", to: "superseded" },
  { from: "accepted", to: "planned" },
  { from: "accepted", to: "rejected" },
  { from: "accepted", to: "superseded" },
  { from: "planned", to: "in_progress" },
  { from: "planned", to: "rejected" },
  { from: "planned", to: "superseded" },
  { from: "in_progress", to: "resolved" },
  { from: "in_progress", to: "planned" },
  { from: "in_progress", to: "superseded" },
];

export function isCanonicalLifecycleState(
  status: string,
): status is (typeof FRICTION_LIFECYCLE_STATES)[number] {
  return (FRICTION_LIFECYCLE_STATES as readonly string[]).includes(status);
}

/** Normalize P0-B aliases into P0-F lifecycle states. */
export function normalizeLifecycleState(
  status: string,
): (typeof FRICTION_LIFECYCLE_STATES)[number] | null {
  if (status === "open") return "observed";
  if (status === "watching") return "verified";
  if (isCanonicalLifecycleState(status)) return status;
  return null;
}
