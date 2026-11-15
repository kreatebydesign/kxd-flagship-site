/**
 * Minor employment compliance gate — offline checks.
 */
import assert from "node:assert/strict";
import { staffActorFromUser } from "../lib/staff/actor.ts";
import { evaluatePaidShiftAllowed } from "../lib/staff-employment/compliance-gate.ts";
import type { StaffEmploymentComplianceRecord } from "../lib/staff-employment/compliance-types.ts";

const harlow = staffActorFromUser({
  id: 88,
  email: "harlow@example.com",
  displayName: "Harlow",
  role: "editor",
  staffRole: "junior_studio_teammate",
  staffOnboardingCompletedAt: "2026-11-01T00:00:00.000Z",
})!;

const tyler = staffActorFromUser({
  id: 3,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler",
  role: "editor",
  staffRole: "business_development_specialist",
  staffOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
})!;

assert.ok(harlow);
assert.ok(tyler);

assert.equal(evaluatePaidShiftAllowed(tyler, null).allowed, true);
assert.equal(evaluatePaidShiftAllowed(harlow, null).allowed, false);

const blockedRecord: StaffEmploymentComplianceRecord = {
  id: 1,
  staffUserId: 88,
  employmentAuthorizationStatus: "pending",
  oregonPermitConfirmed: false,
  permitEffectiveDate: null,
  permitExpirationDate: null,
  approvedWorkCategories: [],
  schoolDayMaxMinutes: 180,
  nonSchoolDayMaxMinutes: 480,
  weeklyMaxMinutes: 960,
  schoolDayEarliestStartLocal: null,
  schoolDayLatestEndLocal: null,
  nonSchoolDayEarliestStartLocal: null,
  nonSchoolDayLatestEndLocal: null,
  schedulingRules: {},
  paidShiftActivation: "blocked",
  payrollSetupConfirmed: false,
  ownerHourlyRateConfirmed: false,
  ownerComplianceNote: null,
  auditEvents: [],
  lastUpdatedByUserId: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

assert.equal(evaluatePaidShiftAllowed(harlow, blockedRecord).allowed, false);

const allowedRecord: StaffEmploymentComplianceRecord = {
  ...blockedRecord,
  employmentAuthorizationStatus: "authorized",
  oregonPermitConfirmed: true,
  paidShiftActivation: "allowed",
  payrollSetupConfirmed: true,
  ownerHourlyRateConfirmed: true,
};

assert.equal(evaluatePaidShiftAllowed(harlow, allowedRecord).allowed, true);

console.log("verify-staff-minor-employment-compliance: OK");