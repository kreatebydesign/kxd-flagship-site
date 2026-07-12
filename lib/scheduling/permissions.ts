/**
 * Phase 25B — Scheduling capability grants (Edition 1, no Organizations).
 *
 * admin → founder-equivalent (all capabilities)
 * editor → suggest only (Heather path)
 * Optional founder email allowlist via KXD_SCHEDULING_FOUNDER_EMAILS
 */

import type { SchedulingActor, SchedulingCapability } from "./types";

export const ALL_SCHEDULING_CAPABILITIES: readonly SchedulingCapability[] = [
  "scheduling.suggest",
  "scheduling.write-internal",
  "scheduling.approve",
  "scheduling.write-restricted",
  "scheduling.manage-connection",
] as const;

export const SUGGEST_ONLY_CAPABILITIES: readonly SchedulingCapability[] = [
  "scheduling.suggest",
] as const;

function founderEmails(): Set<string> {
  const raw =
    process.env.KXD_SCHEDULING_FOUNDER_EMAILS?.trim() ||
    process.env.KXD_INQUIRY_EMAIL?.trim() ||
    "matt@kreatebydesign.com";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isFounderActor(actor: SchedulingActor): boolean {
  const email = actor.email?.trim().toLowerCase();
  if (email && founderEmails().has(email)) return true;
  return actor.role === "admin";
}

export function resolveSchedulingCapabilities(
  actor: SchedulingActor,
): ReadonlySet<SchedulingCapability> {
  if (isFounderActor(actor)) {
    return new Set(ALL_SCHEDULING_CAPABILITIES);
  }
  if (actor.role === "editor") {
    return new Set(SUGGEST_ONLY_CAPABILITIES);
  }
  // Authenticated but unrecognized — suggest only (safe default).
  return new Set(SUGGEST_ONLY_CAPABILITIES);
}

export function actorHasCapability(
  actor: SchedulingActor,
  capability: SchedulingCapability,
): boolean {
  return resolveSchedulingCapabilities(actor).has(capability);
}

export function assertCapability(
  actor: SchedulingActor,
  capability: SchedulingCapability,
): void {
  if (!actorHasCapability(actor, capability)) {
    throw new Error(
      `Scheduling permission denied: missing ${capability}.`,
    );
  }
}
