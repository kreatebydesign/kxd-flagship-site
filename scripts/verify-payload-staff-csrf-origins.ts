/**
 * Staff Time Clock POST auth requires Payload CSRF allowlist to include
 * production staff hosts (portal alias + marketing site).
 *   npm run verify:payload-staff-csrf-origins
 */
import assert from "node:assert/strict";
import { resolvePayloadCsrfOrigins } from "../lib/payload/csrf-origins.ts";
import { PORTAL_HOST } from "../lib/portal/constants.ts";

const origins = resolvePayloadCsrfOrigins();

assert.ok(
  origins.includes("https://www.kreatebydesign.com"),
  "Expected marketing / KXD OS site origin in csrf list",
);
assert.ok(
  origins.includes(`https://${PORTAL_HOST}`),
  `Expected portal staff host https://${PORTAL_HOST} in csrf list`,
);

console.log("verify-payload-staff-csrf-origins: OK");
