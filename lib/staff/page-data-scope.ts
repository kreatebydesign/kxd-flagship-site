import "server-only";

import { staffActorFromUser } from "./actor";
import { resolveStaffClientScope } from "./client-assignments";

/**
 * Review inbox / onboarding loaders: undefined = operator (no filter),
 * number[] = restricted staff client scope (may be empty).
 */
export async function reviewInboxClientScopeForUser(
  user: object,
): Promise<number[] | undefined> {
  const actor = staffActorFromUser(user);
  if (!actor) return undefined;
  const scope = await resolveStaffClientScope(actor);
  if (scope === null) return undefined;
  return scope;
}
