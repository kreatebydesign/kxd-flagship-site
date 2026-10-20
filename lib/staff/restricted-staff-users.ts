import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { staffActorFromUser } from "./actor";
import { isRestrictedStaff } from "./permissions";

/** User ids for internal restricted staff (excludes founder/admin operators). */
export async function listRestrictedStaffUserIds(): Promise<number[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "users",
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });

  const ids: number[] = [];
  for (const doc of result.docs) {
    const actor = staffActorFromUser(doc);
    if (!actor) continue;
    if (!isRestrictedStaff(actor)) continue;
    if (actor.staffRole === "none") continue;
    ids.push(actor.userId);
  }
  return ids;
}

export async function restrictedStaffUserIdSet(): Promise<Set<number>> {
  return new Set(await listRestrictedStaffUserIds());
}
