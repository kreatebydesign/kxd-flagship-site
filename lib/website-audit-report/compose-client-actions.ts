/**
 * Client-facing action-plan composition.
 * Presentation-only: does not mutate stored editor recommendationPlan.
 *
 * Pipeline: validate executable actions → regroup defaults → light wording → dedupe.
 */

import { dedupeClientActionPlan, actionTopicKey, normalizeActionText } from "./dedupe-actions.ts";
import type { ActionPlanGroup, CanonicalActionItem } from "./types.ts";

const OBSERVATION_MARKERS = [
  /\bis present\b/i,
  /\bwas detected\b/i,
  /\bcould be stronger\b/i,
  /\bcould be refined\b/i,
  /\bappears to\b/i,
  /\bthere is\b/i,
  /\bmay feel\b/i,
  /\bis slow\b/i,
  /\bgap\s*\(/i,
  /\bwarning on\b/i,
  /\blimited custom\b/i,
  /\bvisitors may\b/i,
];

const IMPERATIVE_START =
  /^(add|optimize|clarify|define|raise|serve|introduce|strengthen|confirm|remove|fix|implement|update|replace|improve|ensure|create|build|rewrite|align|configure|enable|disable|migrate|standardize|tighten|expand|reduce|audit|document|establish)\b/i;

const MONITOR_ONLY =
  /\b(continue (to )?monitor|ongoing (monitoring|verification)|periodically (re-?check|verify|review)|once (fixed|resolved).{0,40}(verify|re-?check)|keep (watching|monitoring)|maintain (current|existing))\b/i;

function stripFixturePrefix(text: string): string {
  return text.replace(/^(\s*\[local demo\]\s*)+/i, "").trim();
}

/**
 * Deterministic observation vs executable-action classification.
 * Uses source kind + conservative wording signals — not verb-leading alone.
 */
export function isObservationStyleAction(item: CanonicalActionItem): boolean {
  const raw = item.text?.trim() || "";
  if (!raw) return true;
  const body = stripFixturePrefix(raw);
  const normalized = normalizeActionText(body);

  if (item.sourceKind === "manual") return false;
  if (item.sourceKind === "recommendation") {
    // Stored recommendations are treated as actionable unless clearly observational only.
    if (IMPERATIVE_START.test(body)) return false;
    if (OBSERVATION_MARKERS.some((re) => re.test(body)) && !IMPERATIVE_START.test(body)) {
      return true;
    }
    return false;
  }

  // Opportunities default to observation unless they clearly instruct work.
  if (item.sourceKind === "opportunity") {
    if (IMPERATIVE_START.test(body)) return false;
    if (OBSERVATION_MARKERS.some((re) => re.test(body))) return true;
    // Soft observational phrasing without an imperative lead
    if (/\b(could|should|may|might|appears|seems|feels|present but)\b/i.test(body)) return true;
    if (!IMPERATIVE_START.test(body) && normalized.split(" ").length >= 4) return true;
    return false;
  }

  return OBSERVATION_MARKERS.some((re) => re.test(body)) && !IMPERATIVE_START.test(body);
}

export function isExecutableAction(item: CanonicalActionItem): boolean {
  if (!item.text?.trim()) return false;
  if (item.hidden || item.included === false) return false;
  if (item.sourceKind === "manual") return true;
  return !isObservationStyleAction(item);
}

function isCorrectiveRemediation(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /contrast|accessibility|keyboard focus/.test(t) ||
    /https|mixed[\s-]?content/.test(t) ||
    /raise secondary|serve all assets|remove mixed/.test(t)
  );
}

function isGenuineMonitorAction(text: string): boolean {
  return MONITOR_ONLY.test(text) && !isCorrectiveRemediation(text.replace(MONITOR_ONLY, " "));
}

/**
 * Client-facing group correction for generated/default items.
 * Manual operator grouping is preserved.
 */
export function resolveClientFacingGroup(item: CanonicalActionItem): ActionPlanGroup {
  if (item.sourceKind === "manual") return item.group;

  const text = item.text || "";
  if (isGenuineMonitorAction(text)) return "monitor";

  // Unresolved corrective work must not sit under Continue Monitoring.
  if (item.group === "monitor" && isCorrectiveRemediation(text)) {
    return "improve-next";
  }

  const topic = actionTopicKey(text);
  if (
    (topic === "a11y-contrast" || topic === "https-mixed-content") &&
    item.group === "monitor"
  ) {
    return "improve-next";
  }

  return item.group;
}

/**
 * Prefer strongest complete stored recommendation wording; only light cleanup
 * when meaning is preserved exactly (currently: trim + collapse whitespace).
 */
export function polishActionWording(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Drop pure observations; when a related executable recommendation exists in
 * the pool, that recommendation remains (via later dedupe / keep). Observations
 * never invent new recommendation text.
 */
export function filterExecutableActions(
  items: CanonicalActionItem[],
): CanonicalActionItem[] {
  const pool = items.filter((i) => i.included !== false && !i.hidden);
  const executables = pool.filter((i) => isExecutableAction(i));
  const observations = pool.filter((i) => !isExecutableAction(i) && i.text?.trim());

  // Observations are omitted unless an executable already covers the topic —
  // in which case the observation is still omitted (the executable remains).
  void observations;
  return executables.map((item) => ({
    ...item,
    text: polishActionWording(item.text),
    group: resolveClientFacingGroup(item),
    included: true,
  }));
}

/**
 * Full client-facing action composition used by preview/PDF resolve paths.
 */
export function composeClientActionPlan(
  items: CanonicalActionItem[],
): CanonicalActionItem[] {
  const executable = filterExecutableActions(items);
  return dedupeClientActionPlan(executable);
}

/** True when no action id appears in more than one group after composition. */
export function actionPlanHasUniqueGroupMembership(
  items: CanonicalActionItem[],
): boolean {
  const seen = new Map<string, ActionPlanGroup>();
  for (const item of items) {
    const prev = seen.get(item.id);
    if (prev && prev !== item.group) return false;
    seen.set(item.id, item.group);
  }
  return true;
}
