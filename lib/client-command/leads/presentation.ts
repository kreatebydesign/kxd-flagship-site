/**
 * Client Command — deterministic presentation-stage mapping (Primal Phase 1, Build 1).
 * Maps existing MCI lifecycle dimensions → a single calm stage. Pure — safe for verifiers.
 * Never invents a new lifecycle model; this is a read-only presentation lens.
 */

import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";
import type { LeadPresentationStage } from "./types";

/**
 * Priority (highest wins):
 * 1. outcomeState === "won"              → WON
 * 2. outcomeState === "lost"             → LOST
 * 3. qualificationState === "qualified"  → QUALIFIED
 * 4. disposition === "nurturing"         → FOLLOW_UP
 * 5. contacted/working                   → CONTACTED
 * 6. otherwise (new, untouched)          → NEW
 */
export function resolveLeadPresentationStage(
  inquiry: ClientInquiryRecord,
): LeadPresentationStage {
  if (inquiry.outcomeState === "won") return "WON";
  if (inquiry.outcomeState === "lost") return "LOST";
  if (inquiry.qualificationState === "qualified") return "QUALIFIED";
  if (inquiry.disposition === "nurturing") return "FOLLOW_UP";
  if (
    inquiry.disposition === "contacted" ||
    inquiry.disposition === "appointment_set" ||
    inquiry.operationalStatus === "acknowledged" ||
    inquiry.operationalStatus === "in_progress"
  ) {
    return "CONTACTED";
  }
  return "NEW";
}

export function leadPresentationStageLabel(stage: LeadPresentationStage): string {
  switch (stage) {
    case "NEW":
      return "New";
    case "CONTACTED":
      return "Contacted";
    case "FOLLOW_UP":
      return "Follow-up";
    case "QUALIFIED":
      return "Qualified";
    case "WON":
      return "Won";
    case "LOST":
      return "Lost";
    default:
      return "Lead";
  }
}

export function leadDetailHref(inquiryKey: string): string {
  return `/portal/leads/${encodeURIComponent(inquiryKey)}`;
}

/** Human owner label only — never an opaque id. */
export function resolveLeadOwnerLabel(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const name = String(displayName ?? "").trim();
  if (name) return name;
  const mail = String(email ?? "").trim();
  if (mail) return mail;
  return null;
}

export function formatLeadWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(t));
}

export function formatLeadRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diffMs = Date.now() - t;
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  if (mins < 60) return diffMs >= 0 ? `${mins}m ago` : `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 14) return diffMs >= 0 ? `${days}d ago` : `in ${days}d`;
  return formatLeadWhen(iso);
}

export function formatLeadSource(inquiry: ClientInquiryRecord): string {
  const parts = [
    inquiry.utmSource?.trim() || inquiry.sourceMedium?.trim(),
    inquiry.utmCampaign?.trim() || inquiry.campaign?.trim(),
    inquiry.channel ? inquiry.channel.replaceAll("_", " ") : null,
  ].filter(Boolean);
  if (parts.length === 0) return "Source not stored";
  return parts.join(" · ");
}

export function labelizeLeadField(value: string): string {
  return value.replaceAll("_", " ");
}

/** Reuses the existing `.kxd-ces-status--*` pill tokens — no new color system. */
export function leadStageStatusClass(stage: LeadPresentationStage): string {
  switch (stage) {
    case "NEW":
      return "kxd-ces-status--received";
    case "CONTACTED":
      return "kxd-ces-status--review";
    case "FOLLOW_UP":
      return "kxd-ces-status--input";
    case "QUALIFIED":
      return "kxd-ces-status--progress";
    case "WON":
      return "kxd-ces-status--complete";
    case "LOST":
      return "kxd-ces-status--closed";
    default:
      return "kxd-ces-status--received";
  }
}
