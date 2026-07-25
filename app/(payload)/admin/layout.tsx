import "server-only";

import { redirect } from "next/navigation";

import { getPayloadAdminUser } from "@/lib/admin/auth";
import {
  isRestrictedStaff,
  staffActorFromUser,
  staffLandingPathForUser,
} from "@/lib/staff";

/**
 * Payload Admin route tree gate.
 *
 * Restricted staff must never render Payload collection/global administration.
 * Redirect server-side before RootPage chrome paints when possible.
 * Unauthenticated visitors pass through to Payload login.
 */
export default async function PayloadAdminIsolationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getPayloadAdminUser();
  if (user) {
    const actor = staffActorFromUser(user);
    if (actor && isRestrictedStaff(actor)) {
      redirect(staffLandingPathForUser(user));
    }
  }

  return children;
}
