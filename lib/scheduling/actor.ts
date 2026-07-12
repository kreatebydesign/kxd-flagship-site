import type { SchedulingActor } from "@/lib/scheduling/types";

/** Map Payload admin session user → scheduling actor. */
export function schedulingActorFromUser(user: {
  id?: number | string;
  email?: string | null;
  role?: string | null;
  displayName?: string | null;
}): SchedulingActor {
  const userId =
    user.id != null && Number.isFinite(Number(user.id)) ? Number(user.id) : null;
  return {
    userId,
    email: typeof user.email === "string" ? user.email : null,
    role: typeof user.role === "string" ? user.role : null,
    displayName:
      typeof user.displayName === "string" ? user.displayName : null,
  };
}
