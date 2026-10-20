import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  actorUsesAssignedClientScope,
  listActiveAssignedClientIds,
} from "@/lib/staff/client-assignments";
import type { StaffActor } from "@/lib/staff/types";
import { isRestrictedStaff } from "@/lib/staff/permissions";
import { WORK_COLLECTION } from "./constants";
import { deliverableSummaryFromDoc } from "@/lib/staff/work-deliverables-service";
import { toWorkListItem } from "./runner";
import type { WorkListItem, WorkStatus } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Where = Record<string, any>;

const STAFF_WORK_HREF_PREFIX = "/admin/operations/staff/work";

function withStaffHref(work: WorkListItem): WorkListItem {
  return {
    ...work,
    href: `${STAFF_WORK_HREF_PREFIX}/${work.id}`,
    adminHref: `${STAFF_WORK_HREF_PREFIX}/${work.id}`,
  };
}

function buildAssignedWhere(
  userId: number,
  options: {
    includeCompleted: boolean;
    assignedClientIds: number[] | null;
  },
): Where {
  const and: Where[] = [
    { assignedTo: { equals: userId } },
    { status: { not_equals: "archived" } },
  ];

  if (!options.includeCompleted) {
    and.push({ status: { not_equals: "completed" } });
  }

  if (options.assignedClientIds != null) {
    if (options.assignedClientIds.length === 0) {
      and.push({ client: { exists: false } });
    } else {
      and.push({
        or: [
          { client: { exists: false } },
          { client: { in: options.assignedClientIds } },
        ],
      });
    }
  }

  return { and };
}

/**
 * Scoped Payload query — does not load the full Work Engine portfolio.
 */
export async function listWorkAssignedToStaffActor(
  actor: StaffActor,
  options?: { includeCompleted?: boolean; limit?: number },
): Promise<WorkListItem[]> {
  if (!isRestrictedStaff(actor)) {
    return [];
  }

  const includeCompleted = options?.includeCompleted ?? false;
  const limit = options?.limit ?? 200;

  let assignedClientIds: number[] | null = null;
  if (actorUsesAssignedClientScope(actor)) {
    assignedClientIds = await listActiveAssignedClientIds(actor.userId);
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: WORK_COLLECTION as any,
    where: buildAssignedWhere(actor.userId, {
      includeCompleted,
      assignedClientIds,
    }),
    sort: "-updatedAt",
    limit,
    depth: 1,
    overrideAccess: true,
  });

  return result.docs
    .map((doc) => {
      const work = toWorkListItem(doc as Record<string, unknown>);
      const summary = deliverableSummaryFromDoc(
        doc as Record<string, unknown>,
        work.assignedToId,
      );
      return summary ? { ...work, deliverableProgress: summary } : work;
    })
    .filter((work) => work.assignedToId === actor.userId)
    .map(withStaffHref);
}

export async function staffActorMayAccessWorkItem(
  actor: StaffActor,
  work: WorkListItem,
): Promise<boolean> {
  if (!isRestrictedStaff(actor)) return true;
  if (work.assignedToId !== actor.userId) return false;
  if (!actorUsesAssignedClientScope(actor)) return true;
  if (work.clientId == null) return true;
  const ids = await listActiveAssignedClientIds(actor.userId);
  return ids.includes(work.clientId);
}

export function staffAllowedStatusTargets(): WorkStatus[] {
  return [
    "planned",
    "in-progress",
    "waiting-on-client",
    "waiting-on-kxd",
    "blocked",
    "review",
  ];
}
