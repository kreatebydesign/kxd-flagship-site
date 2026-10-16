/**
 * Training Phase 1 — role-specific path eligibility (server-side rules).
 */
import assert from "node:assert/strict";
import { BDS_FOUNDATION_PATH } from "../lib/training/bds-foundation";
import { readPublishedCatalog } from "../lib/training/curriculum";
import { resolveGrowthTrackForStaffRole } from "../lib/training/growth-tracks";
import {
  assertTrainingLessonAccess,
  assertTrainingPathAccess,
  BDS_FOUNDATION_SLUG,
  EXECUTIVE_OPS_FOUNDATION_SLUG,
  filterCatalogForUser,
  primaryTrainingPathSlugForRole,
} from "../lib/training/role-access";
import { STAFF_FOUNDATION_PATH } from "../lib/training/staff-foundation";
import { pickRecommendedLesson } from "../lib/training/map";
import { buildProgressMap, toPathView } from "../lib/training/map";

console.log("\nverify:training-role-access\n");

const heather = {
  id: 42,
  email: "heather@kreatebydesign.com",
  displayName: "Heather",
  role: "editor",
  staffRole: "operations_coordinator",
};

const tyler = {
  id: 99,
  email: "tyler@kreatebydesign.com",
  displayName: "Tyler Rethwill",
  role: "editor",
  staffRole: "business_development_specialist",
};

const matt = {
  id: 1,
  email: "matt@kreatebydesign.com",
  displayName: "Matt",
  role: "admin",
  staffRole: "none",
};

assert.equal(primaryTrainingPathSlugForRole("operations_coordinator"), EXECUTIVE_OPS_FOUNDATION_SLUG);
assert.equal(primaryTrainingPathSlugForRole("business_development_specialist"), BDS_FOUNDATION_SLUG);

assert.equal(assertTrainingPathAccess(heather, EXECUTIVE_OPS_FOUNDATION_SLUG), true);
assert.equal(assertTrainingPathAccess(heather, "billing-finance"), true);
assert.equal(assertTrainingPathAccess(tyler, EXECUTIVE_OPS_FOUNDATION_SLUG), false);
assert.equal(assertTrainingPathAccess(tyler, "billing-finance"), false);
assert.equal(assertTrainingPathAccess(tyler, BDS_FOUNDATION_SLUG), true);
assert.equal(assertTrainingPathAccess(matt, EXECUTIVE_OPS_FOUNDATION_SLUG), true);
assert.equal(assertTrainingPathAccess(matt, "billing-finance"), true);

const firstExecLesson = STAFF_FOUNDATION_PATH.lessons[0]!.slug;
assert.equal(
  assertTrainingLessonAccess(tyler, EXECUTIVE_OPS_FOUNDATION_SLUG, firstExecLesson),
  false,
);
assert.equal(
  assertTrainingLessonAccess(heather, EXECUTIVE_OPS_FOUNDATION_SLUG, firstExecLesson),
  true,
);

const heatherPaths = filterCatalogForUser(readPublishedCatalog(), heather);
const tylerPaths = filterCatalogForUser(readPublishedCatalog(), tyler);
assert.ok(heatherPaths.some((p) => p.slug === EXECUTIVE_OPS_FOUNDATION_SLUG));
assert.ok(!tylerPaths.some((p) => p.slug === EXECUTIVE_OPS_FOUNDATION_SLUG));
assert.ok(tylerPaths.some((p) => p.slug === BDS_FOUNDATION_SLUG));
assert.ok(!tylerPaths.some((p) => p.slug === "billing-finance"));

assert.equal(STAFF_FOUNDATION_PATH.lessons.length, 15);
assert.equal(BDS_FOUNDATION_PATH.lessons.length, 9);

const bdsTrack = resolveGrowthTrackForStaffRole("business_development_specialist");
assert.match(bdsTrack.roleTitle, /Business Development/);

const tylerViews = tylerPaths
  .filter((p) => p.status === "published")
  .map((p) => toPathView(p, buildProgressMap([])));
const recommended = pickRecommendedLesson(tylerViews, BDS_FOUNDATION_SLUG);
assert.equal(recommended?.pathSlug, BDS_FOUNDATION_SLUG);

console.log("✓ Coordinator vs BDS path eligibility");
console.log("✓ Admin retains full catalog access");
console.log("✓ BDS foundation path (9 modules) in catalog\n");
