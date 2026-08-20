/**
 * Promote a research-leads intake record into a sales-leads opportunity.
 * Idempotent: duplicate promotion returns the existing sales opportunity.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { resolveResearchContactDisplay } from "@/lib/research-leads/intake";
import { buildOpportunityIntelligencePromoteSummary } from "@/lib/research-leads/opportunity-intelligence";
import { logSalesActivity } from "./activities";
import { initialResponseDueAt } from "./follow-up-policy";
import type { SalesDoc } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type PromoteResearchLeadResult =
  | {
      ok: true;
      salesLeadId: number;
      researchLeadId: number;
      created: boolean;
      salesLead: SalesDoc;
    }
  | { ok: false; message: string; code?: "not_found" | "conflict" | "error" };

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number") return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  }
  return null;
}

function prospectNames(research: AnyDoc, contactEmail: string | null): {
  companyName: string;
  contactName: string;
} {
  const business = String(research.businessName ?? "").trim();
  const city = String(research.city ?? "").trim();
  const service = String(research.estimatedService ?? "").trim();
  const companyName =
    business ||
    [city, service].filter(Boolean).join(" · ") ||
    contactEmail ||
    `Research #${research.id}`;
  const contactName = business || "Contact TBD";
  return { companyName, contactName };
}

export async function promoteResearchLeadToSales(
  researchLeadId: number,
  options?: { operatorLabel?: string },
): Promise<PromoteResearchLeadResult> {
  if (!researchLeadId || !Number.isFinite(researchLeadId)) {
    return { ok: false, message: "Valid research lead id required.", code: "not_found" };
  }

  const payload = await getPayload({ config });

  let research: AnyDoc;
  try {
    research = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "research-leads" as any,
      id: researchLeadId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return { ok: false, message: "Research lead not found.", code: "not_found" };
  }

  const existingPromotedId = relId(research.promotedSalesLead);
  if (existingPromotedId) {
    try {
      const existing = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "sales-leads" as any,
        id: existingPromotedId,
        depth: 0,
        overrideAccess: true,
      })) as SalesDoc;
      return {
        ok: true,
        salesLeadId: existingPromotedId,
        researchLeadId,
        created: false,
        salesLead: existing,
      };
    } catch {
      // Fall through and repair link if orphaned.
    }
  }

  const bySource = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    limit: 1,
    depth: 0,
    where: { sourceResearchLead: { equals: researchLeadId } },
    overrideAccess: true,
  });
  if (bySource.docs[0]) {
    const salesLead = bySource.docs[0] as SalesDoc;
    const salesLeadId = Number(salesLead.id);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "research-leads" as any,
      id: researchLeadId,
      data: {
        promotedSalesLead: salesLeadId,
        promotedAt: research.promotedAt ?? new Date().toISOString(),
      },
      overrideAccess: true,
    });
    return {
      ok: true,
      salesLeadId,
      researchLeadId,
      created: false,
      salesLead,
    };
  }

  const contact = resolveResearchContactDisplay(research);
  const { companyName, contactName } = prospectNames(research, contact.contactEmail);
  const juniorId = relId(research.juniorCreatorUser);
  const sourcedByName = String(research.researcherName ?? "").trim() || null;

  try {
    const created = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      data: {
        companyName,
        contactName,
        email: contact.contactEmail || undefined,
        phone: contact.contactPhone || undefined,
        website: contact.opportunityUrl || undefined,
        opportunityUrl: contact.opportunityUrl || undefined,
        industry: research.estimatedService || undefined,
        source: research.source || "research",
        notes: research.notes || undefined,
        status: "new",
        nextAction: "respond-today",
        nextFollowUp: initialResponseDueAt(
          research.createdAt ? new Date(String(research.createdAt)) : new Date(),
        ).toISOString(),
        sourceResearchLead: researchLeadId,
        sourcedByJuniorCreator: juniorId ?? undefined,
        sourcedByName: sourcedByName ?? undefined,
        researchSubmittedAt: research.createdAt || undefined,
        probability: 25,
      },
      overrideAccess: true,
    })) as SalesDoc;

    const salesLeadId = Number(created.id);

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "research-leads" as any,
      id: researchLeadId,
      data: {
        promotedSalesLead: salesLeadId,
        promotedAt: new Date().toISOString(),
        status:
          research.status === "rejected" || research.status === "closed-lost"
            ? research.status
            : "qualified",
      },
      overrideAccess: true,
    });

    try {
      const oiSnapshot = buildOpportunityIntelligencePromoteSummary({
        grade: research.grade != null ? String(research.grade) : null,
        triggerType: research.triggerType != null ? String(research.triggerType) : null,
        eventDate: research.eventDate != null ? String(research.eventDate) : null,
        digitalGap: research.digitalGap != null ? String(research.digitalGap) : null,
        urgency: research.urgency != null ? String(research.urgency) : null,
        commercialBand:
          research.commercialBand != null ? String(research.commercialBand) : null,
        recommendedChannel:
          research.recommendedChannel != null
            ? String(research.recommendedChannel)
            : null,
      });
      await logSalesActivity({
        activityType: "note",
        title: "Promoted from Research",
        summary: [
          `Research lead #${researchLeadId} promoted to Sales.`,
          sourcedByName ? `Sourced by ${sourcedByName}.` : null,
          options?.operatorLabel ? `Operator: ${options.operatorLabel}.` : null,
          oiSnapshot,
        ]
          .filter(Boolean)
          .join("\n\n"),
        leadId: salesLeadId,
      });
    } catch (err) {
      console.error("[KXD Sales] Promote activity log failed:", err);
    }

    return {
      ok: true,
      salesLeadId,
      researchLeadId,
      created: true,
      salesLead: created,
    };
  } catch (err) {
    console.error("[KXD Sales] Promote failed:", err);
    // Unique index race — re-fetch existing.
    const again = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      limit: 1,
      where: { sourceResearchLead: { equals: researchLeadId } },
      overrideAccess: true,
    });
    if (again.docs[0]) {
      const salesLead = again.docs[0] as SalesDoc;
      return {
        ok: true,
        salesLeadId: Number(salesLead.id),
        researchLeadId,
        created: false,
        salesLead,
      };
    }
    return {
      ok: false,
      message: "Failed to promote research lead.",
      code: "error",
    };
  }
}
