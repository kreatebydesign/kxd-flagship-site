/**
 * Integration: Payload cookie auth + Origin allowlist for staff time POST.
 * Runs in-process (no browser). Validates portal + www origins.
 */
import assert from "node:assert/strict";
import { resolvePayloadCsrfOrigins } from "../lib/payload/csrf-origins.ts";
import { PORTAL_HOST } from "../lib/portal/constants.ts";

const origins = resolvePayloadCsrfOrigins();
const portalOrigin = `https://${PORTAL_HOST}`;
const wwwOrigin = "https://www.kreatebydesign.com";

assert.ok(origins.includes(portalOrigin), "portal origin must be in csrf list");
assert.ok(origins.includes(wwwOrigin), "www origin must be in csrf list");

// Payload compares request Origin header to csrf list (see extractJWT behavior).
function originWouldAllowCookieAuth(origin: string): boolean {
  return origins.includes(origin);
}

assert.ok(
  originWouldAllowCookieAuth(portalOrigin),
  "portal POST Origin must allow cookie JWT",
);
assert.ok(
  originWouldAllowCookieAuth(wwwOrigin),
  "www POST Origin must allow cookie JWT",
);
assert.ok(
  !originWouldAllowCookieAuth("https://evil.example"),
  "unlisted origins must not allow cookie JWT",
);

console.log("verify-staff-time-post-auth-headers: OK");
