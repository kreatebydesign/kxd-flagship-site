/**
 * Isolated staff-time verification fixtures — local/test Postgres only.
 */
import type { Payload } from "payload";
import { staffActorFromUser } from "../../lib/staff/actor.ts";
import type { StaffActor } from "../../lib/staff/types.ts";
import {
  assertSafeWriteTarget,
  resolveDbTarget,
} from "./payload-db-target.ts";

export const STAFF_TIME_VERIFY_EMAIL_DOMAIN = "kxd-staff-time-verify.local";

export function assertStaffTimeVerifyDatabase(): void {
  const target = resolveDbTarget();
  assertSafeWriteTarget(target, "local");
  if (target.kind === "sqlite") {
    throw new Error(
      "Staff time runtime verification requires local Postgres (not SQLite).",
    );
  }
}

export function staffTimeVerifyEmail(tag: string): string {
  return `staff-time+${tag}@${STAFF_TIME_VERIFY_EMAIL_DOMAIN}`;
}

export type StaffTimeVerifyFixture = {
  userId: number;
  userDoc: object;
  actor: StaffActor;
  email: string;
};

export async function createBdsStaffTimeFixture(
  payload: Payload,
  tag: string,
): Promise<StaffTimeVerifyFixture> {
  const email = staffTimeVerifyEmail(tag);
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs[0]) {
    await payload.delete({
      collection: "users",
      id: existing.docs[0].id,
      overrideAccess: true,
    });
  }

  const userDoc = await payload.create({
    collection: "users",
    data: {
      email,
      password: "StaffTimeVerifyPass123!",
      displayName: `Staff Time Verify ${tag}`,
      role: "editor",
      staffRole: "business_development_specialist",
      staffOnboardingCompletedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  });

  const actor = staffActorFromUser(userDoc);
  if (!actor) throw new Error("Failed to build staff actor for fixture.");

  return {
    userId: actor.userId,
    userDoc,
    actor,
    email,
  };
}

export async function deleteStaffTimeFixtureUser(
  payload: Payload,
  userId: number,
): Promise<void> {
  try {
    await payload.delete({
      collection: "users",
      id: userId,
      overrideAccess: true,
    });
  } catch {
    // Cascade should remove shifts/punches.
  }
}
