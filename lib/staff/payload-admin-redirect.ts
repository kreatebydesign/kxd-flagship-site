import "server-only";

import { redirect } from "next/navigation";

import { getPayloadAdminUser } from "@/lib/admin/auth";
import {
  isRestrictedStaff,
  staffActorFromUser,
  staffLandingPathForUser,
} from "@/lib/staff";

/**
 * After Payload authentication succeeds, restricted staff must leave the
 * Payload Admin route tree before access-denied / dashboard UI can strand them.
 * Call before rendering Payload RootLayout when possible.
 */
export async function redirectRestrictedStaffFromPayloadAdmin(): Promise<void> {
  const user = await getPayloadAdminUser();
  if (!user) return;

  const actor = staffActorFromUser(user);
  if (actor && isRestrictedStaff(actor)) {
    redirect(staffLandingPathForUser(user));
  }
}
