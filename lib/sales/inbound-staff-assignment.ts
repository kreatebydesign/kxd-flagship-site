/**
 * Default staff assignment for KXD inbound → sales-leads promotion.
 * Fair distribution among eligible Business Development staff — never hardcoded to one person.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { staffActorFromUser } from "@/lib/staff/actor";
import { actorHasStaffCapability } from "@/lib/staff/permissions";
import { relUserId } from "@/lib/staff/sales/access";
import type { SalesDoc } from "./types";
import { type AnyDoc } from "./promote-helpers";
import {
  pickInboundSalesAssignee,
  type InboundAssigneeCandidate,
  type InboundStaffAssignment,
} from "./inbound-staff-assignment-policy";

export {
  inboundAssignmentActivitySuffix,
  pickInboundSalesAssignee,
  toAssignedStaffUserData,
  type InboundAssigneeCandidate,
  type InboundStaffAssignment,
} from "./inbound-staff-assignment-policy";

export async function listEligibleInboundSalesAssignees(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any,
): Promise<InboundAssigneeCandidate[]> {
  const db = payload ?? (await getPayload({ config }));
  const users = await db.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "users" as any,
    where: {
      and: [
        { staffRole: { equals: "business_development_specialist" } },
        { staffOnboardingCompletedAt: { exists: true } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  const eligible: InboundAssigneeCandidate[] = [];
  for (const doc of users.docs) {
    const actor = staffActorFromUser(doc);
    if (!actor?.onboardingCompletedAt) continue;
    if (!actorHasStaffCapability(actor, "staff.sales.manage")) continue;
    eligible.push({ userId: actor.userId, displayName: actor.displayName });
  }
  return eligible;
}

export async function resolveInboundSalesStaffAssignment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any,
): Promise<InboundStaffAssignment> {
  const db = payload ?? (await getPayload({ config }));
  const eligible = await listEligibleInboundSalesAssignees(db);
  if (eligible.length === 0) return {};

  const counts = new Map<number, number>();
  for (const candidate of eligible) counts.set(candidate.userId, 0);

  const openLeads = await db.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    where: {
      and: [
        { status: { not_in: ["won", "lost"] } },
        { assignedStaffUser: { in: eligible.map((row) => row.userId) } },
      ],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of openLeads.docs as AnyDoc[]) {
    const id = relUserId(doc.assignedStaffUser);
    if (id != null && counts.has(id)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const pickedId = pickInboundSalesAssignee(eligible, counts);
  if (!pickedId) return {};
  const picked = eligible.find((row) => row.userId === pickedId);
  return {
    assignedStaffUser: pickedId,
    assigneeLabel: picked?.displayName,
  };
}

/** Apply default assignment only when the opportunity has no staff owner yet. */
export async function inboundStaffFieldsForNewOrUnassignedLead(
  salesLead: SalesDoc | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any,
): Promise<InboundStaffAssignment> {
  if (salesLead) {
    const assigned = relUserId(salesLead.assignedStaffUser);
    const sourced = relUserId(salesLead.sourcedByStaffUser);
    if (assigned != null || sourced != null) return {};
  }
  return resolveInboundSalesStaffAssignment(payload);
}
