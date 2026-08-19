/**
 * Conservative commercial identity matching for first-party inbound → sales-leads.
 * High-confidence exact matches may link. Ambiguous matches must not auto-merge.
 */

import { relId, type AnyDoc } from "./promote-helpers";

export function normalizeEmail(value: unknown): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || !raw.includes("@")) return null;
  return raw;
}

export function normalizeDomain(value: unknown): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw.includes("@")) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(withProtocol).hostname.replace(/^www\./, "");
    if (!host || !host.includes(".")) return null;
    const generic = new Set([
      "gmail.com",
      "googlemail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
      "aol.com",
      "me.com",
    ]);
    if (generic.has(host)) return null;
    return host;
  } catch {
    return null;
  }
}

export function normalizeCompany(value: unknown): string | null {
  const raw = String(value ?? "")
    .toLowerCase()
    .replace(/[.,'"/]/g, " ")
    .replace(/\b(inc|llc|ltd|co|corp|company)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return raw.length >= 3 ? raw : null;
}

export type IdentityCollision =
  | { kind: "none" }
  | {
      kind: "exact";
      salesLead: AnyDoc;
      via: "email" | "domain";
    }
  | {
      kind: "ambiguous";
      candidates: Array<{ id: number; via: "email" | "domain" | "company"; reason: string }>;
    };

function isOpenLead(lead: AnyDoc): boolean {
  const status = String(lead.status ?? "new");
  return status !== "won" && status !== "lost";
}

export function classifyIdentityCollision(input: {
  email?: string | null;
  website?: string | null;
  company?: string | null;
  openLeads: AnyDoc[];
  closedLeads?: AnyDoc[];
}): IdentityCollision {
  const email = normalizeEmail(input.email);
  const domain = normalizeDomain(input.website);
  const company = normalizeCompany(input.company);

  const exact: Array<{ lead: AnyDoc; via: "email" | "domain" }> = [];
  const ambiguous: Array<{
    id: number;
    via: "email" | "domain" | "company";
    reason: string;
  }> = [];

  for (const lead of input.openLeads) {
    const leadEmail = normalizeEmail(lead.email);
    const leadDomain = normalizeDomain(lead.website || lead.opportunityUrl);
    const leadCompany = normalizeCompany(lead.companyName);

    if (email && leadEmail && email === leadEmail) {
      exact.push({ lead, via: "email" });
      continue;
    }

    if (domain && leadDomain && domain === leadDomain) {
      if (!email || !leadEmail || email === leadEmail || company === leadCompany) {
        exact.push({ lead, via: "domain" });
      } else {
        ambiguous.push({
          id: Number(lead.id),
          via: "domain",
          reason: "Same website domain with a different email.",
        });
      }
      continue;
    }

    if (company && leadCompany && company === leadCompany) {
      ambiguous.push({
        id: Number(lead.id),
        via: "company",
        reason:
          email && leadEmail && email !== leadEmail
            ? "Same company name with a different email."
            : "Company name matches without a confirmed email or domain match.",
      });
    }
  }

  for (const lead of input.closedLeads ?? []) {
    const leadEmail = normalizeEmail(lead.email);
    const leadDomain = normalizeDomain(lead.website || lead.opportunityUrl);
    if (email && leadEmail && email === leadEmail) {
      ambiguous.push({
        id: Number(lead.id),
        via: "email",
        reason: `Closed opportunity (${String(lead.status)}) with the same email.`,
      });
    } else if (domain && leadDomain && domain === leadDomain) {
      ambiguous.push({
        id: Number(lead.id),
        via: "domain",
        reason: `Closed opportunity (${String(lead.status)}) with the same domain.`,
      });
    }
  }

  const uniqueExact = new Map<number, { lead: AnyDoc; via: "email" | "domain" }>();
  for (const hit of exact) {
    uniqueExact.set(Number(hit.lead.id), hit);
  }

  if (uniqueExact.size === 1 && ambiguous.length === 0) {
    const only = [...uniqueExact.values()][0];
    if (only && isOpenLead(only.lead)) {
      return { kind: "exact", salesLead: only.lead, via: only.via };
    }
  }

  if (uniqueExact.size > 1) {
    return {
      kind: "ambiguous",
      candidates: [...uniqueExact.values()].map((hit) => ({
        id: Number(hit.lead.id),
        via: hit.via,
        reason: "Multiple open opportunities match this identity.",
      })),
    };
  }

  if (ambiguous.length > 0) {
    return { kind: "ambiguous", candidates: ambiguous };
  }

  return { kind: "none" };
}

export function existingSourceInquiryId(lead: AnyDoc): number | null {
  return relId(lead.sourceInquiry);
}
