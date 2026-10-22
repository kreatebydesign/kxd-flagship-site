/**
 * Staff time capability and API scope checks (no DB).
 *   npx tsx scripts/verify-staff-time-authorization.ts
 */
import assert from "node:assert/strict";
import {
  actorHasStaffCapability,
  resolveStaffCapabilities,
} from "../lib/staff/permissions.ts";
import type { StaffActor } from "../lib/staff/types.ts";

const tyler: StaffActor = {
  userId: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler Rethwill",
  role: "editor",
  staffRole: "business_development_specialist",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

const heather: StaffActor = {
  userId: 2,
  email: "heather@kreatebydesign.com",
  displayName: "Heather",
  role: "editor",
  staffRole: "operations_coordinator",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

const matt: StaffActor = {
  userId: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt Lunger",
  role: "admin",
  staffRole: "none",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

const tylerCaps = resolveStaffCapabilities(tyler);
const heatherCaps = resolveStaffCapabilities(heather);
const mattCaps = resolveStaffCapabilities(matt);

assert.ok(tylerCaps.has("staff.time.clock"));
assert.ok(tylerCaps.has("staff.time.read.self"));
assert.ok(!tylerCaps.has("admin.time.oversight.read"));

assert.ok(heatherCaps.has("staff.time.clock"));
assert.ok(!heatherCaps.has("admin.time.oversight.read"));

assert.ok(mattCaps.has("admin.time.oversight.read"));
assert.ok(mattCaps.has("admin.time.correct"));
assert.ok(!tylerCaps.has("admin.time.correct"));
assert.ok(actorHasStaffCapability(matt, "staff.time.clock"));

assert.ok(
  !actorHasStaffCapability(tyler, "admin.time.oversight.read"),
  "BDS must not access operator oversight API capability.",
);

console.log("verify-staff-time-authorization: OK");
