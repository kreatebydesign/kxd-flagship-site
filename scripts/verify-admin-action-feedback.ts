/**
 * Offline verification — admin action feedback + session messaging.
 *   npx tsx scripts/verify-admin-action-feedback.ts
 */
import assert from "node:assert/strict";
import {
  adminLoginHrefWithReturn,
  adminSessionExpiredMessage,
  isAdminUnauthorizedResponse,
  KXD_ADMIN_TOKEN_EXPIRATION_SECONDS,
} from "../lib/admin/client-action-feedback.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

assert.equal(isAdminUnauthorizedResponse(401, { error: "Unauthorized." }), true);
assert.equal(isAdminUnauthorizedResponse(401, { ok: false }), true);
assert.equal(isAdminUnauthorizedResponse(403, { error: "Staff permission denied." }), false);
assert.equal(isAdminUnauthorizedResponse(400, { error: "Contract send blocked." }), false);
assert.equal(isAdminUnauthorizedResponse(200, { ok: true }), false);
assert.equal(isAdminUnauthorizedResponse(400, { error: "Unauthorized." }), true);

const msg = adminSessionExpiredMessage();
assert.match(msg, /session expired/i);
assert.doesNotMatch(msg, /^Unauthorized\.?$/i);

assert.equal(adminLoginHrefWithReturn("/admin/operations/client-command/19/commercial/agreements/4"), 
  "/admin/login?redirect=%2Fadmin%2Foperations%2Fclient-command%2F19%2Fcommercial%2Fagreements%2F4");
assert.equal(adminLoginHrefWithReturn("//evil.example"), "/admin/login");
assert.equal(adminLoginHrefWithReturn("https://evil.example"), "/admin/login");

assert.ok(KXD_ADMIN_TOKEN_EXPIRATION_SECONDS >= 60 * 60 * 8);

const usersSrc = readFileSync(join(process.cwd(), "payload/collections/Users.ts"), "utf8");
assert.match(usersSrc, /tokenExpiration:\s*60\s*\*\s*60\s*\*\s*8/);

const lifecycleSrc = readFileSync(
  join(process.cwd(), "components/admin/sales/ContractLifecycleActions.tsx"),
  "utf8",
);
assert.match(lifecycleSrc, /credentials:\s*[\"']include[\"']|adminFetchInit/);
assert.match(lifecycleSrc, /bringAdminStatusMessageIntoView/);
assert.match(lifecycleSrc, /isAdminUnauthorizedResponse/);
assert.match(lifecycleSrc, /adminSessionExpiredMessage/);

// Lifecycle route uses one shared auth gate for all actions — no Step-2-only deny.
const routeSrc = readFileSync(
  join(process.cwd(), "app/api/admin/sales/contracts/[id]/lifecycle/route.ts"),
  "utf8",
);
assert.match(routeSrc, /requirePayloadAdminApi/);
assert.match(routeSrc, /case \"sign-operator\"/);
assert.match(routeSrc, /case \"send-for-client-signature\"/);
assert.doesNotMatch(
  routeSrc,
  /case \"send-for-client-signature\"[\s\S]{0,200}Unauthorized/,
);

console.log("verify-admin-action-feedback: OK");
