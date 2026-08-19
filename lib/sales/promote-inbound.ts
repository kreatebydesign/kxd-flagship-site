/**
 * Promote KXD inbound intake records into canonical sales-leads.
 * First-party /contact inquiries auto-promote after create.
 * Research Desk and website audits remain operator-promoted.
 * Idempotent: duplicate promotion returns the existing sales opportunity.
 * Identity collisions: exact email/domain may link; ambiguous cases do not merge.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type {
  PromoteToSalesOptions,
  PromoteToSalesResult,
} from "@/lib/acquisition-operations/promote-types";
import { logSalesActivity } from "./activities";
import {
  classifyIdentityCollision,
  existingSourceInquiryId,
} from "./identity";
import { initialResponseDueAt } from "./follow-up-policy";
import type { SalesDoc } from "./types";
import {
  INQUIRY_BUDGET_MIDPOINTS,
  PROJECT_INVESTMENT_MIDPOINTS,
  buildNotes,
  isInquiryEligibleForPromotion,
  isProjectInquiryEligibleForPromotion,
  isWebsiteAuditEligibleForPromotion,
  relId,
  trimText,
  type AnyDoc,
} from "./promote-helpers";

async function resolveExistingBySource(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  sourceField: "sourceInquiry" | "sourceProjectInquiry" | "sourceWebsiteAudit";
  sourceId: number;
  sourceCollection: "inquiries" | "project-inquiries" | "website-audits";
  sourceDoc: AnyDoc;
}): Promise<{ salesLead: SalesDoc; salesLeadId: number } | null> {
  const { payload, sourceField, sourceId, sourceCollection, sourceDoc } = params;

  const existingPromotedId = relId(sourceDoc.promotedSalesLead);
  if (existingPromotedId) {
    try {
      const existing = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "sales-leads" as any,
        id: existingPromotedId,
        depth: 0,
        overrideAccess: true,
      })) as SalesDoc;
      return { salesLead: existing, salesLeadId: existingPromotedId };
    } catch {
      // Orphaned reverse link — repair via forward lookup.
    }
  }

  const bySource = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    limit: 1,
    depth: 0,
    where: { [sourceField]: { equals: sourceId } },
    overrideAccess: true,
  });

  if (!bySource.docs[0]) return null;

  const salesLead = bySource.docs[0] as SalesDoc;
  const salesLeadId = Number(salesLead.id);
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: sourceCollection as any,
    id: sourceId,
    data: {
      promotedSalesLead: salesLeadId,
      promotedAt: sourceDoc.promotedAt ?? new Date().toISOString(),
    },
    overrideAccess: true,
  });

  return { salesLead, salesLeadId };
}

async function recoverAfterUniqueRace(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  sourceField: "sourceInquiry" | "sourceProjectInquiry" | "sourceWebsiteAudit";
  sourceId: number;
}): Promise<SalesDoc | null> {
  const again = await params.payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    limit: 1,
    where: { [params.sourceField]: { equals: params.sourceId } },
    overrideAccess: true,
  });
  return (again.docs[0] as SalesDoc) ?? null;
}

function success(params: {
  salesLead: SalesDoc;
  salesLeadId: number;
  sourceRecordType: "inquiry" | "project_inquiry" | "website_audit";
  sourceRecordId: number;
  created: boolean;
  origin: string;
  linkedExisting?: boolean;
  collisionVia?: "email" | "domain" | "source";
}): PromoteToSalesResult {
  const promotedAt = new Date().toISOString();
  return {
    ok: true,
    salesLeadId: params.salesLeadId,
    sourceRecordType: params.sourceRecordType,
    sourceRecordId: params.sourceRecordId,
    created: params.created,
    salesLead: params.salesLead,
    linkedExisting: params.linkedExisting,
    collisionVia: params.collisionVia,
    provenance: {
      context: "kxd_acquisition",
      sourceRecordType: params.sourceRecordType,
      sourceRecordId: params.sourceRecordId,
      origin: params.origin,
      promotedToType: "sales_lead",
      promotedToId: params.salesLeadId,
      promotedAt,
      created: params.created,
    },
  };
}

async function loadSalesLeadsForIdentity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
): Promise<{ open: AnyDoc[]; closed: AnyDoc[] }> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });
  const docs = (result.docs ?? []) as AnyDoc[];
  return {
    open: docs.filter((d) => !["won", "lost"].includes(String(d.status))),
    closed: docs.filter((d) => ["won", "lost"].includes(String(d.status))),
  };
}

async function linkInquiryToExistingLead(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  inquiry: AnyDoc;
  inquiryId: number;
  salesLead: SalesDoc;
  via: "email" | "domain";
  operatorLabel?: string;
}): Promise<{ salesLead: SalesDoc; salesLeadId: number }> {
  const salesLeadId = Number(params.salesLead.id);
  const existingSource = existingSourceInquiryId(params.salesLead);
  const leadUpdate: Record<string, unknown> = {};
  if (!existingSource) leadUpdate.sourceInquiry = params.inquiryId;

  const existingNotes = trimText(params.salesLead.notes, 4000) ?? "";
  const inboundNote = [
    `Linked inbound inquiry #${params.inquiryId} (${params.via}).`,
    trimText(params.inquiry.message, 800),
  ]
    .filter(Boolean)
    .join("\n");
  leadUpdate.notes = existingNotes
    ? `${existingNotes}\n\n${inboundNote}`
    : inboundNote;

  if (
    String(params.salesLead.nextAction ?? "none") === "none" &&
    !["won", "lost"].includes(String(params.salesLead.status))
  ) {
    leadUpdate.nextAction = "respond-today";
    leadUpdate.nextFollowUp = initialResponseDueAt(
      params.inquiry.createdAt ? new Date(String(params.inquiry.createdAt)) : new Date(),
    ).toISOString();
  }

  if (Object.keys(leadUpdate).length > 0) {
    await params.payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id: salesLeadId,
      data: leadUpdate,
      overrideAccess: true,
    });
  }

  await params.payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "inquiries" as any,
    id: params.inquiryId,
    data: {
      promotedSalesLead: salesLeadId,
      promotedAt: new Date().toISOString(),
      status: String(params.inquiry.status ?? "new") === "new" ? "reviewed" : params.inquiry.status,
      kxdOs: {
        ...(typeof params.inquiry.kxdOs === "object" && params.inquiry.kxdOs
          ? params.inquiry.kxdOs
          : {}),
        leadId: String(salesLeadId),
      },
    },
    overrideAccess: true,
  });

  try {
    await logSalesActivity({
      activityType: "note",
      title: "Inbound application linked",
      summary: [
        `Inquiry #${params.inquiryId} linked to existing opportunity via ${params.via}.`,
        params.operatorLabel ? `Operator: ${params.operatorLabel}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      leadId: salesLeadId,
    });
  } catch (err) {
    console.error("[KXD Sales] Linked inquiry activity log failed:", err);
  }

  const refreshed = (await params.payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    id: salesLeadId,
    depth: 0,
    overrideAccess: true,
  })) as SalesDoc;

  return { salesLead: refreshed, salesLeadId };
}

export async function promoteInquiryToSales(
  inquiryId: number,
  options?: PromoteToSalesOptions,
): Promise<PromoteToSalesResult> {
  if (!inquiryId || !Number.isFinite(inquiryId)) {
    return { ok: false, message: "Valid inquiry id required.", code: "not_found" };
  }

  const payload = await getPayload({ config });
  let inquiry: AnyDoc;
  try {
    inquiry = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "inquiries" as any,
      id: inquiryId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return { ok: false, message: "Inquiry not found.", code: "not_found" };
  }

  const status = String(inquiry.status ?? "new");
  const existing = await resolveExistingBySource({
    payload,
    sourceField: "sourceInquiry",
    sourceId: inquiryId,
    sourceCollection: "inquiries",
    sourceDoc: inquiry,
  });
  if (existing) {
    return success({
      ...existing,
      sourceRecordType: "inquiry",
      sourceRecordId: inquiryId,
      created: false,
      origin: String(inquiry.source ?? "contact"),
      collisionVia: "source",
    });
  }

  if (!isInquiryEligibleForPromotion(status)) {
    return {
      ok: false,
      message: `Inquiry status "${status}" is not eligible for Sales promotion.`,
      code: "not_eligible",
    };
  }

  const identityPool = await loadSalesLeadsForIdentity(payload);
  const collision = classifyIdentityCollision({
    email: inquiry.email,
    website: inquiry.website,
    company: inquiry.company,
    openLeads: identityPool.open,
    closedLeads: identityPool.closed,
  });

  if (collision.kind === "exact") {
    const linked = await linkInquiryToExistingLead({
      payload,
      inquiry,
      inquiryId,
      salesLead: collision.salesLead as SalesDoc,
      via: collision.via,
      operatorLabel: options?.operatorLabel,
    });
    return success({
      ...linked,
      sourceRecordType: "inquiry",
      sourceRecordId: inquiryId,
      created: false,
      linkedExisting: true,
      collisionVia: collision.via,
      origin: String(inquiry.source ?? "contact"),
    });
  }

  if (collision.kind === "ambiguous") {
    const ids = collision.candidates.map((c) => c.id);
    const reviewNote = [
      "Identity collision — review before promoting.",
      ...collision.candidates.map((c) => `Sales lead #${c.id} (${c.via}): ${c.reason}`),
    ].join("\n");
    try {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "inquiries" as any,
        id: inquiryId,
        data: {
          nextStep: "Identity collision — review in Sales before promoting.",
          internalNotes: [trimText(inquiry.internalNotes), reviewNote]
            .filter(Boolean)
            .join("\n\n"),
        },
        overrideAccess: true,
      });
    } catch (err) {
      console.error("[KXD Sales] Failed to mark inquiry for identity review:", err);
    }
    return {
      ok: false,
      message:
        "An existing commercial opportunity may match this inquiry. Review before creating a duplicate.",
      code: "needs_review",
      candidateSalesLeadIds: ids,
    };
  }

  const companyName =
    trimText(inquiry.company, 200) ||
    trimText(inquiry.name, 200) ||
    `Inquiry #${inquiryId}`;
  const contactName = trimText(inquiry.name, 200) || "Contact TBD";
  const budgetKey = String(inquiry.budget ?? "");
  const estimatedValue = INQUIRY_BUDGET_MIDPOINTS[budgetKey] || undefined;
  const notes = buildNotes([
    trimText(inquiry.message),
    inquiry.internalNotes ? `Internal notes:\n${trimText(inquiry.internalNotes)}` : null,
    inquiry.referral ? `Referral: ${trimText(inquiry.referral, 200)}` : null,
    inquiry.inquiryType ? `Inquiry type: ${inquiry.inquiryType}` : null,
    inquiry.timeline ? `Timeline: ${inquiry.timeline}` : null,
    inquiry.partnershipPackage
      ? `Partnership interest: ${inquiry.partnershipPackage}`
      : null,
  ]);

  try {
    const created = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      data: {
        companyName,
        contactName,
        email: trimText(inquiry.email, 320) || undefined,
        phone: trimText(inquiry.phone, 80) || undefined,
        website: trimText(inquiry.website, 500) || undefined,
        industry: trimText(inquiry.inquiryType, 120) || undefined,
        source: trimText(inquiry.source, 200) || "contact",
        notes,
        status: "new",
        nextAction: "respond-today",
        nextFollowUp: initialResponseDueAt(
          inquiry.createdAt ? new Date(String(inquiry.createdAt)) : new Date(),
        ).toISOString(),
        sourceInquiry: inquiryId,
        estimatedValue,
        probability: 25,
        assignedTo: trimText(inquiry.assignedOwner, 120) || undefined,
      },
      overrideAccess: true,
    })) as SalesDoc;

    const salesLeadId = Number(created.id);
    try {
      await logSalesActivity({
        activityType: "note",
        title: "Inbound application received",
        summary: [
          `Inquiry #${inquiryId} entered Sales from ${String(inquiry.source ?? "contact")}.`,
          trimText(inquiry.company) ? `Company: ${trimText(inquiry.company)}.` : null,
          trimText(inquiry.website) ? `Website: ${trimText(inquiry.website)}.` : null,
          inquiry.budget ? `Budget: ${inquiry.budget}.` : null,
          inquiry.timeline ? `Timeline: ${inquiry.timeline}.` : null,
          trimText(inquiry.message, 400),
          options?.operatorLabel ? `Operator: ${options.operatorLabel}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
        leadId: salesLeadId,
      });
    } catch (err) {
      console.error("[KXD Sales] Inquiry promote activity log failed:", err);
    }

    const provenance = {
      promotedSalesLead: salesLeadId,
      promotedAt: new Date().toISOString(),
      kxdOs: {
        ...(typeof inquiry.kxdOs === "object" && inquiry.kxdOs ? inquiry.kxdOs : {}),
        leadId: String(salesLeadId),
      },
    };
    try {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "inquiries" as any,
        id: inquiryId,
        data: {
          ...provenance,
          status: status === "new" ? "reviewed" : status,
        },
        overrideAccess: true,
      });
    } catch (err) {
      console.error("[KXD Sales] Inquiry reverse-link status update failed; writing provenance only:", err);
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "inquiries" as any,
        id: inquiryId,
        data: provenance,
        overrideAccess: true,
      });
    }

    return success({
      salesLead: created,
      salesLeadId,
      sourceRecordType: "inquiry",
      sourceRecordId: inquiryId,
      created: true,
      origin: String(inquiry.source ?? "contact"),
    });
  } catch (err) {
    console.error("[KXD Sales] Promote inquiry failed:", err);
    const raced = await recoverAfterUniqueRace({
      payload,
      sourceField: "sourceInquiry",
      sourceId: inquiryId,
    });
    if (raced) {
      return success({
        salesLead: raced,
        salesLeadId: Number(raced.id),
        sourceRecordType: "inquiry",
        sourceRecordId: inquiryId,
        created: false,
        origin: String(inquiry.source ?? "contact"),
      });
    }
    return { ok: false, message: "Failed to promote inquiry.", code: "error" };
  }
}

export async function promoteProjectInquiryToSales(
  projectInquiryId: number,
  options?: PromoteToSalesOptions,
): Promise<PromoteToSalesResult> {
  if (!projectInquiryId || !Number.isFinite(projectInquiryId)) {
    return { ok: false, message: "Valid project inquiry id required.", code: "not_found" };
  }

  const payload = await getPayload({ config });
  let projectInquiry: AnyDoc;
  try {
    projectInquiry = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "project-inquiries" as any,
      id: projectInquiryId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return { ok: false, message: "Project inquiry not found.", code: "not_found" };
  }

  const status = String(projectInquiry.status ?? "new");
  const existing = await resolveExistingBySource({
    payload,
    sourceField: "sourceProjectInquiry",
    sourceId: projectInquiryId,
    sourceCollection: "project-inquiries",
    sourceDoc: projectInquiry,
  });
  if (existing) {
    return success({
      ...existing,
      sourceRecordType: "project_inquiry",
      sourceRecordId: projectInquiryId,
      created: false,
      origin: "start-project",
    });
  }

  if (!isProjectInquiryEligibleForPromotion(status)) {
    return {
      ok: false,
      message: `Project inquiry status "${status}" is not eligible for Sales promotion.`,
      code: "not_eligible",
    };
  }

  const companyName =
    trimText(projectInquiry.companyName, 200) ||
    trimText(projectInquiry.contactName, 200) ||
    `Project inquiry #${projectInquiryId}`;
  const contactName = trimText(projectInquiry.contactName, 200) || "Contact TBD";
  const investmentKey = String(projectInquiry.investmentRange ?? "");
  const estimatedValue = PROJECT_INVESTMENT_MIDPOINTS[investmentKey] || undefined;
  const notes = buildNotes([
    projectInquiry.businessGoals
      ? `Business goals:\n${trimText(projectInquiry.businessGoals)}`
      : null,
    projectInquiry.servicesInterested
      ? `Services: ${trimText(projectInquiry.servicesInterested, 500)}`
      : null,
    projectInquiry.assetsAvailable
      ? `Assets: ${trimText(projectInquiry.assetsAvailable, 500)}`
      : null,
    projectInquiry.timeline ? `Timeline: ${projectInquiry.timeline}` : null,
    projectInquiry.investmentRange
      ? `Investment range: ${projectInquiry.investmentRange}`
      : null,
    trimText(projectInquiry.notes),
  ]);

  try {
    const created = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      data: {
        companyName,
        contactName,
        email: trimText(projectInquiry.email, 320) || undefined,
        phone: trimText(projectInquiry.phone, 80) || undefined,
        website: trimText(projectInquiry.websiteUrl, 500) || undefined,
        industry: trimText(projectInquiry.servicesInterested, 120) || undefined,
        source: "start-project",
        notes,
        status: "new",
        nextAction: "respond-today",
        nextFollowUp: initialResponseDueAt(
          projectInquiry.createdAt
            ? new Date(String(projectInquiry.createdAt))
            : new Date(),
        ).toISOString(),
        sourceProjectInquiry: projectInquiryId,
        estimatedValue,
        probability: 30,
      },
      overrideAccess: true,
    })) as SalesDoc;

    const salesLeadId = Number(created.id);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "project-inquiries" as any,
      id: projectInquiryId,
      data: {
        promotedSalesLead: salesLeadId,
        promotedAt: new Date().toISOString(),
        status: status === "new" ? "reviewing" : status,
      },
      overrideAccess: true,
    });

    try {
      await logSalesActivity({
        activityType: "note",
        title: "Promoted from Start Project",
        summary: [
          `Project inquiry #${projectInquiryId} promoted to Sales.`,
          options?.operatorLabel ? `Operator: ${options.operatorLabel}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
        leadId: salesLeadId,
      });
    } catch (err) {
      console.error("[KXD Sales] Project inquiry promote activity log failed:", err);
    }

    return success({
      salesLead: created,
      salesLeadId,
      sourceRecordType: "project_inquiry",
      sourceRecordId: projectInquiryId,
      created: true,
      origin: "start-project",
    });
  } catch (err) {
    console.error("[KXD Sales] Promote project inquiry failed:", err);
    const raced = await recoverAfterUniqueRace({
      payload,
      sourceField: "sourceProjectInquiry",
      sourceId: projectInquiryId,
    });
    if (raced) {
      return success({
        salesLead: raced,
        salesLeadId: Number(raced.id),
        sourceRecordType: "project_inquiry",
        sourceRecordId: projectInquiryId,
        created: false,
        origin: "start-project",
      });
    }
    return {
      ok: false,
      message: "Failed to promote project inquiry.",
      code: "error",
    };
  }
}

export async function promoteWebsiteAuditToSales(
  websiteAuditId: number,
  options?: PromoteToSalesOptions,
): Promise<PromoteToSalesResult> {
  if (!websiteAuditId || !Number.isFinite(websiteAuditId)) {
    return { ok: false, message: "Valid website audit id required.", code: "not_found" };
  }

  const payload = await getPayload({ config });
  let audit: AnyDoc;
  try {
    audit = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "website-audits" as any,
      id: websiteAuditId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return { ok: false, message: "Website audit not found.", code: "not_found" };
  }

  const status = String(audit.status ?? "new-lead");
  const existing = await resolveExistingBySource({
    payload,
    sourceField: "sourceWebsiteAudit",
    sourceId: websiteAuditId,
    sourceCollection: "website-audits",
    sourceDoc: audit,
  });
  if (existing) {
    return success({
      ...existing,
      sourceRecordType: "website_audit",
      sourceRecordId: websiteAuditId,
      created: false,
      origin: "website-audit",
    });
  }

  if (!isWebsiteAuditEligibleForPromotion(status)) {
    return {
      ok: false,
      message: `Website audit status "${status}" is not eligible for Sales promotion.`,
      code: "not_eligible",
    };
  }

  const companyName =
    trimText(audit.company, 200) ||
    trimText(audit.name, 200) ||
    `Website audit #${websiteAuditId}`;
  const contactName = trimText(audit.name, 200) || "Contact TBD";
  const notes = buildNotes([
    audit.website ? `Audited website: ${trimText(audit.website, 500)}` : null,
    audit.overallScore != null
      ? `Audit score: ${audit.overallScore}${audit.grade ? ` (${audit.grade})` : ""}`
      : null,
    audit.internalNotes ? `Internal notes:\n${trimText(audit.internalNotes)}` : null,
    "Promoted from Website Audit — diagnostic record remains the audit source of truth.",
  ]);

  try {
    const created = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      data: {
        companyName,
        contactName,
        email: trimText(audit.email, 320) || undefined,
        website: trimText(audit.website, 500) || undefined,
        opportunityUrl: trimText(audit.website, 500) || undefined,
        source: "website-audit",
        notes,
        status: "new",
        nextAction: "respond-today",
        nextFollowUp: initialResponseDueAt(
          audit.createdAt ? new Date(String(audit.createdAt)) : new Date(),
        ).toISOString(),
        sourceWebsiteAudit: websiteAuditId,
        probability: 25,
      },
      overrideAccess: true,
    })) as SalesDoc;

    const salesLeadId = Number(created.id);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "website-audits" as any,
      id: websiteAuditId,
      data: {
        promotedSalesLead: salesLeadId,
        promotedAt: new Date().toISOString(),
        status: status === "new-lead" ? "contacted" : status,
      },
      overrideAccess: true,
    });

    try {
      await logSalesActivity({
        activityType: "note",
        title: "Promoted from Website Audit",
        summary: [
          `Website audit #${websiteAuditId} promoted to Sales.`,
          options?.operatorLabel ? `Operator: ${options.operatorLabel}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
        leadId: salesLeadId,
      });
    } catch (err) {
      console.error("[KXD Sales] Website audit promote activity log failed:", err);
    }

    return success({
      salesLead: created,
      salesLeadId,
      sourceRecordType: "website_audit",
      sourceRecordId: websiteAuditId,
      created: true,
      origin: "website-audit",
    });
  } catch (err) {
    console.error("[KXD Sales] Promote website audit failed:", err);
    const raced = await recoverAfterUniqueRace({
      payload,
      sourceField: "sourceWebsiteAudit",
      sourceId: websiteAuditId,
    });
    if (raced) {
      return success({
        salesLead: raced,
        salesLeadId: Number(raced.id),
        sourceRecordType: "website_audit",
        sourceRecordId: websiteAuditId,
        created: false,
        origin: "website-audit",
      });
    }
    return {
      ok: false,
      message: "Failed to promote website audit.",
      code: "error",
    };
  }
}
