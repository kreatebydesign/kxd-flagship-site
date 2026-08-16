/**
 * Shared helpers for promoting KXD intake records into canonical sales-leads.
 */
import type { SalesDoc } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDoc = Record<string, any>;

export function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number") return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  }
  return null;
}

export function trimText(value: unknown, max = 2000): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export const INQUIRY_BUDGET_MIDPOINTS: Record<string, number> = {
  "under-5k": 3_500,
  "5k-10k": 7_500,
  "10k-25k": 17_500,
  "25k-50k": 37_500,
  "50k-plus": 65_000,
};

export const PROJECT_INVESTMENT_MIDPOINTS: Record<string, number> = {
  "under-10k": 7_500,
  "10k-25k": 17_500,
  "25k-50k": 37_500,
  "50k-100k": 75_000,
  "100k-plus": 125_000,
  "not-determined": 0,
};

export function isInquiryEligibleForPromotion(status: string): boolean {
  return !["spam", "archived"].includes(status);
}

export function isProjectInquiryEligibleForPromotion(status: string): boolean {
  return !["closed", "completed"].includes(status);
}

export function isWebsiteAuditEligibleForPromotion(status: string): boolean {
  return status !== "closed-lost";
}

export function buildNotes(parts: Array<string | null | undefined>): string | undefined {
  const lines = parts.map((p) => String(p ?? "").trim()).filter(Boolean);
  if (lines.length === 0) return undefined;
  return lines.join("\n\n");
}

export type ExistingSalesLookup = {
  salesLead: SalesDoc;
  salesLeadId: number;
};
