import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  ATTENTION_KIND_LABEL,
  deriveAttentionKind,
  isDueToday,
  isOpenCommercialStatus,
} from "@/lib/sales/attention";
import { getLeadActivities, logSalesActivity } from "@/lib/sales/activities";
import { initialResponseDueAt } from "@/lib/sales/follow-up-policy";
import {
  defaultObligationAfterOutreach,
  type OutreachKind,
} from "@/lib/sales/follow-up-policy";
import { isNextAction, NEXT_ACTION_LABEL, type NextAction } from "@/lib/sales/next-action";
import { validateObligationPatch } from "@/lib/sales/obligation";
import type { StaffActor } from "../types";
import {
  assertStaffMayAccessSalesLead,
  relUserId,
  staffMayAccessSalesLead,
  type SalesLeadDoc,
} from "./access";
import {
  filterStaffVisibleSalesActivities,
  staffVisibleLeadQualificationNotes,
  STAFF_OUTBOUND_LEAD_SOURCE,
  isStaffVisibleSalesActivity,
} from "./projection";
import {
  assertStaffLeadStatusTransition,
  isStaffAllowedLeadStatus,
  isStaffAllowedNextAction,
  rejectForbiddenStaffLeadPatchKeys,
  STAFF_SALES_ALLOWED_STATUSES,
  STAFF_SALES_ALLOWED_NEXT_ACTIONS,
  STAFF_SALES_OPERATOR_ONLY_STATUSES,
} from "./policy";
import type { LeadStatus } from "@/lib/sales/types";
import type {
  StaffSalesDetailData,
  StaffSalesListData,
  StaffSalesProspectRow,
} from "./types";

const COLLECTION = "sales-leads" as const;
const STAFF_SOURCE = STAFF_OUTBOUND_LEAD_SOURCE;

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  discovery: "Discovery",
  nurturing: "In conversation",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Not moving",
};

function detailHref(id: number): string {
  return `/admin/operations/staff/sales/${id}`;
}

function toRow(
  lead: SalesLeadDoc,
  lastMeaningfulAt: string | null,
): StaffSalesProspectRow {
  const status = String(lead.status ?? "new");
  const rawNext = String(lead.nextAction ?? "none");
  const nextAction: NextAction = isNextAction(rawNext) ? rawNext : "none";
  const nextFollowUp = lead.nextFollowUp ? String(lead.nextFollowUp) : null;
  const createdAt = String(lead.createdAt ?? "");
  const attentionKind = deriveAttentionKind({
    status,
    nextAction,
    nextFollowUp,
    createdAt,
    lastMeaningfulAt: lastMeaningfulAt || createdAt,
  });

  return {
    id: Number(lead.id),
    companyName: String(lead.companyName ?? "Prospect"),
    contactName: String(lead.contactName ?? "—"),
    email: lead.email ? String(lead.email) : null,
    status,
    statusLabel: STATUS_LABEL[status] ?? status,
    nextAction,
    nextActionLabel: NEXT_ACTION_LABEL[nextAction],
    nextFollowUp,
    attentionKind,
    attentionLabel: attentionKind ? ATTENTION_KIND_LABEL[attentionKind] : null,
    updatedAt: String(lead.updatedAt ?? ""),
    href: detailHref(Number(lead.id)),
  };
}

function staffLeadWhere(actor: StaffActor) {
  return {
    or: [
      { sourcedByStaffUser: { equals: actor.userId } },
      { assignedStaffUser: { equals: actor.userId } },
    ],
  };
}

async function loadLastMeaningfulByLead(
  leadIds: number[],
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (leadIds.length === 0) return map;

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-activities" as any,
    where: { lead: { in: leadIds } },
    limit: Math.min(leadIds.length * 5, 500),
    depth: 0,
    sort: "-occurredAt",
    overrideAccess: true,
  });

  for (const activity of result.docs as SalesLeadDoc[]) {
    const leadId = relUserId(activity.lead);
    if (!leadId || map.has(leadId)) continue;
    if (!isStaffVisibleSalesActivity(activity)) continue;
    if (activity.occurredAt) map.set(leadId, String(activity.occurredAt));
  }
  return map;
}

export async function loadStaffSalesList(
  actor: StaffActor,
): Promise<StaffSalesListData> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: staffLeadWhere(actor) as any,
    limit: 200,
    depth: 0,
    sort: "-updatedAt",
    overrideAccess: true,
  });

  const docs = result.docs as SalesLeadDoc[];
  const ids = docs.map((d) => Number(d.id));
  const lastByLead = await loadLastMeaningfulByLead(ids);
  const prospects = docs.map((d) =>
    toRow(d, lastByLead.get(Number(d.id)) ?? null),
  );

  const open = prospects.filter((p) => isOpenCommercialStatus(p.status));
  const now = new Date();
  const overdue = open.filter(
    (p) => p.attentionKind === "overdue" || p.attentionKind === "overdue-response",
  );
  const dueToday = open.filter(
    (p) =>
      p.attentionKind === "due-today" ||
      p.attentionKind === "respond-today" ||
      isDueToday(p.nextFollowUp, now),
  );

  const attention = [...open]
    .filter((p) => p.attentionKind != null && p.attentionKind !== "scheduled")
    .sort((a, b) => {
      const rank = (k: StaffSalesProspectRow) =>
        k.attentionKind === "overdue-response"
          ? 1
          : k.attentionKind === "overdue"
            ? 2
            : k.attentionKind === "respond-today"
              ? 3
              : k.attentionKind === "due-today"
                ? 4
                : 9;
      return rank(a) - rank(b);
    });

  return {
    prospects,
    attention,
    counts: {
      total: prospects.length,
      open: open.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function loadStaffSalesDetail(
  actor: StaffActor,
  leadId: number,
): Promise<StaffSalesDetailData | null> {
  const payload = await getPayload({ config });
  let lead: SalesLeadDoc;
  try {
    lead = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: leadId,
      depth: 0,
      overrideAccess: true,
    })) as SalesLeadDoc;
  } catch {
    return null;
  }

  if (!staffMayAccessSalesLead(actor, lead)) return null;

  const lastMap = await loadLastMeaningfulByLead([leadId]);
  const row = toRow(lead, lastMap.get(leadId) ?? null);
  const activities = filterStaffVisibleSalesActivities(
    (await getLeadActivities(leadId, 50)) as SalesLeadDoc[],
  );
  const status = String(lead.status ?? "new");

  return {
    prospect: {
      ...row,
      phone: lead.phone ? String(lead.phone) : null,
      website: lead.website ? String(lead.website) : null,
      opportunityUrl: lead.opportunityUrl ? String(lead.opportunityUrl) : null,
      industry: lead.industry ? String(lead.industry) : null,
      notes: staffVisibleLeadQualificationNotes(lead, actor),
      nextActionNote: lead.nextActionNote ? String(lead.nextActionNote) : null,
      probability:
        lead.probability != null && lead.probability !== ""
          ? Number(lead.probability)
          : null,
      createdAt: String(lead.createdAt ?? ""),
      isOperatorControlled: STAFF_SALES_OPERATOR_ONLY_STATUSES.has(
        status as LeadStatus,
      ),
    },
    activities,
    allowedNextActions: [...STAFF_SALES_ALLOWED_NEXT_ACTIONS].map((value) => ({
      value,
      label: NEXT_ACTION_LABEL[value],
    })),
    allowedStatuses: [...STAFF_SALES_ALLOWED_STATUSES].map((value) => ({
      value,
      label: STATUS_LABEL[value] ?? value,
    })),
  };
}

export type CreateStaffProspectInput = {
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  website?: string;
  opportunityUrl?: string;
  industry?: string;
  notes?: string;
  allowDuplicateCompany?: boolean;
};

export type CreateStaffProspectResult =
  | { ok: true; id: number; reusedExisting: boolean }
  | { ok: false; status: number; error: string; existingId?: number };

export async function createStaffProspect(
  actor: StaffActor,
  input: CreateStaffProspectInput,
): Promise<CreateStaffProspectResult> {
  const companyName = input.companyName.trim();
  const contactName = input.contactName.trim();
  const email = input.email?.trim().toLowerCase() ?? "";

  if (!companyName || !contactName) {
    return { ok: false, status: 400, error: "Organization and contact name are required." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: "Email is invalid." };
  }

  const payload = await getPayload({ config });

  if (email) {
    const byEmail = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      limit: 1,
      where: {
        and: [
          { email: { equals: email } },
          { status: { not_in: ["won", "lost"] } },
        ],
      },
      depth: 0,
      overrideAccess: true,
    });
    const existing = byEmail.docs[0] as SalesLeadDoc | undefined;
    if (existing) {
      if (staffMayAccessSalesLead(actor, existing)) {
        return {
          ok: true,
          id: Number(existing.id),
          reusedExisting: true,
        };
      }
      return {
        ok: false,
        status: 409,
        error:
          "An open prospect with this email already exists. Ask Matt if this should be assigned to you.",
      };
    }
  }

  const byCompany = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    limit: 1,
    where: {
      and: [
        { companyName: { equals: companyName } },
        { status: { not_in: ["won", "lost"] } },
      ],
    },
    depth: 0,
    overrideAccess: true,
  });
  const companyHit = byCompany.docs[0] as SalesLeadDoc | undefined;
  if (companyHit && input.allowDuplicateCompany !== true) {
    if (staffMayAccessSalesLead(actor, companyHit)) {
      return {
        ok: true,
        id: Number(companyHit.id),
        reusedExisting: true,
      };
    }
    return {
      ok: false,
      status: 409,
      error: "An open prospect with this organization name already exists.",
    };
  }

  const displayName = actor.displayName?.trim() || actor.email;
  const record = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      companyName,
      contactName,
      email: email || undefined,
      phone: input.phone?.trim() || undefined,
      website: input.website?.trim() || undefined,
      opportunityUrl: input.opportunityUrl?.trim() || undefined,
      industry: input.industry?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      source: STAFF_SOURCE,
      sourcedByStaffUser: actor.userId,
      sourcedByName: displayName,
      status: "new",
      nextAction: "respond-today",
      nextFollowUp: initialResponseDueAt().toISOString(),
      probability: 25,
    },
    overrideAccess: true,
  });

  await logSalesActivity({
    activityType: "note",
    title: "Prospect created",
    summary: `Created by ${displayName} via Staff Sales Development.`,
    leadId: Number(record.id),
  });

  return { ok: true, id: Number(record.id), reusedExisting: false };
}

export type PatchStaffProspectResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function patchStaffProspect(
  actor: StaffActor,
  leadId: number,
  body: Record<string, unknown>,
): Promise<PatchStaffProspectResult> {
  const forbidden = rejectForbiddenStaffLeadPatchKeys(body);
  if (forbidden) return { ok: false, status: 403, error: forbidden };

  const payload = await getPayload({ config });
  let existing: SalesLeadDoc;
  try {
    existing = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: leadId,
      depth: 0,
      overrideAccess: true,
    })) as SalesLeadDoc;
  } catch {
    return { ok: false, status: 404, error: "Prospect not found." };
  }

  try {
    assertStaffMayAccessSalesLead(actor, existing);
  } catch (err) {
    return {
      ok: false,
      status: 403,
      error: err instanceof Error ? err.message : "Permission denied.",
    };
  }

  const currentStatus = String(existing.status ?? "new");
  if (STAFF_SALES_OPERATOR_ONLY_STATUSES.has(currentStatus as never)) {
    return {
      ok: false,
      status: 403,
      error:
        "This opportunity is under operator commercial control and cannot be edited here.",
    };
  }

  const data: Record<string, unknown> = {};

  if (body.companyName != null) {
    const v = String(body.companyName).trim();
    if (!v) return { ok: false, status: 400, error: "Organization name is required." };
    data.companyName = v;
  }
  if (body.contactName != null) {
    const v = String(body.contactName).trim();
    if (!v) return { ok: false, status: 400, error: "Contact name is required." };
    data.contactName = v;
  }
  if (body.email !== undefined) {
    const v = String(body.email ?? "").trim().toLowerCase();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return { ok: false, status: 400, error: "Email is invalid." };
    }
    data.email = v || null;
  }
  if (body.phone !== undefined) data.phone = String(body.phone ?? "").trim() || null;
  if (body.website !== undefined) data.website = String(body.website ?? "").trim() || null;
  if (body.opportunityUrl !== undefined) {
    data.opportunityUrl = String(body.opportunityUrl ?? "").trim() || null;
  }
  if (body.industry !== undefined) data.industry = String(body.industry ?? "").trim() || null;
  if (body.notes !== undefined) data.notes = String(body.notes ?? "").trim() || null;
  if (body.tags !== undefined) data.tags = String(body.tags ?? "").trim() || null;
  if (body.probability !== undefined) {
    const n = Number(body.probability);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { ok: false, status: 400, error: "Probability must be 0–100." };
    }
    data.probability = n;
  }

  if (body.status != null) {
    if (!isStaffAllowedLeadStatus(body.status)) {
      return {
        ok: false,
        status: 403,
        error: "Staff permission denied: commercial stage changes require Matt.",
      };
    }
    try {
      assertStaffLeadStatusTransition(currentStatus, String(body.status));
    } catch (err) {
      return {
        ok: false,
        status: 403,
        error: err instanceof Error ? err.message : "Status change denied.",
      };
    }
    data.status = body.status;
  }

  if (body.nextAction != null) {
    if (!isStaffAllowedNextAction(body.nextAction)) {
      return { ok: false, status: 403, error: "Next action not allowed for staff." };
    }
    data.nextAction = body.nextAction;
  }
  if (body.nextActionNote !== undefined) {
    data.nextActionNote = String(body.nextActionNote ?? "").trim() || null;
  }
  if (body.nextFollowUp !== undefined) {
    data.nextFollowUp = body.nextFollowUp ? String(body.nextFollowUp) : null;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, status: 400, error: "No valid fields to update." };
  }

  const currentNextAction: NextAction = isNextAction(existing.nextAction)
    ? existing.nextAction
    : "none";

  if (
    data.nextAction != null ||
    data.nextFollowUp !== undefined ||
    data.status != null
  ) {
    const validated = validateObligationPatch({
      currentStatus: currentStatus,
      currentNextAction,
      patch: {
        status: data.status as string | undefined,
        nextAction: data.nextAction as NextAction | undefined,
        nextFollowUp:
          data.nextFollowUp === undefined
            ? undefined
            : (data.nextFollowUp as string | null),
        nextActionNote: data.nextActionNote as string | null | undefined,
      },
    });
    if (!validated.ok) {
      return { ok: false, status: 400, error: validated.message };
    }
    Object.assign(data, validated.data);
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: leadId,
    data,
    overrideAccess: true,
  });

  return { ok: true };
}

export async function logStaffProspectOutreach(
  actor: StaffActor,
  leadId: number,
  input: {
    kind: OutreachKind;
    summary?: string;
    nextAction?: string;
    nextFollowUp?: string;
    nextActionNote?: string;
  },
): Promise<PatchStaffProspectResult> {
  const payload = await getPayload({ config });
  let lead: SalesLeadDoc;
  try {
    lead = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: leadId,
      depth: 0,
      overrideAccess: true,
    })) as SalesLeadDoc;
  } catch {
    return { ok: false, status: 404, error: "Prospect not found." };
  }

  try {
    assertStaffMayAccessSalesLead(actor, lead);
  } catch (err) {
    return {
      ok: false,
      status: 403,
      error: err instanceof Error ? err.message : "Permission denied.",
    };
  }

  const status = String(lead.status ?? "new");
  if (STAFF_SALES_OPERATOR_ONLY_STATUSES.has(status as never)) {
    return {
      ok: false,
      status: 403,
      error: "Cannot log outreach on operator-controlled opportunities.",
    };
  }

  const OUTREACH: Record<
    OutreachKind,
    { activityType: "email" | "call" | "meeting" | "note" | "follow-up"; title: string }
  > = {
    email: { activityType: "email", title: "Email sent" },
    call: { activityType: "call", title: "Call logged" },
    meeting: { activityType: "meeting", title: "Meeting logged" },
    note: { activityType: "note", title: "Note added" },
    "follow-up": { activityType: "follow-up", title: "Follow-up logged" },
  };

  const kind = input.kind;
  if (!OUTREACH[kind]) {
    return { ok: false, status: 400, error: "Invalid outreach kind." };
  }

  const meta = OUTREACH[kind];
  await logSalesActivity({
    activityType: meta.activityType,
    title: meta.title,
    summary: input.summary?.trim() || undefined,
    leadId,
  });

  if (status !== "won" && status !== "lost") {
    const fallback = defaultObligationAfterOutreach(kind);
    let nextAction: NextAction = fallback.nextAction;
    if (input.nextAction != null) {
      if (!isStaffAllowedNextAction(input.nextAction)) {
        return { ok: false, status: 403, error: "Next action not allowed for staff." };
      }
      nextAction = input.nextAction;
    }
    const validated = validateObligationPatch({
      currentStatus: status,
      currentNextAction: isNextAction(lead.nextAction) ? lead.nextAction : "none",
      patch: {
        nextAction,
        nextFollowUp: input.nextFollowUp
          ? String(input.nextFollowUp)
          : fallback.nextFollowUp.toISOString(),
        nextActionNote: input.nextActionNote
          ? String(input.nextActionNote)
          : undefined,
      },
    });
    if (!validated.ok) {
      return { ok: false, status: 400, error: validated.message };
    }
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: leadId,
      data: validated.data,
      overrideAccess: true,
    });
  }

  return { ok: true };
}
