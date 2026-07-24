/**
 * Guards portal display dates against SSR/client hydration text mismatch.
 * Root cause: toLocaleDateString without an explicit timeZone shifts the
 * calendar day between UTC hosts (Vercel) and US-Pacific browsers.
 */
import assert from "node:assert/strict";
import { fmtPortalDate } from "../lib/portal/format.ts";
import { KXD_BUSINESS_TIMEZONE } from "../lib/platform/timezone.ts";

const sample = "2026-07-22T00:00:00.000Z";

const expected = new Date(sample).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: KXD_BUSINESS_TIMEZONE,
});

assert.equal(expected, "Jul 21, 2026");

const previousTz = process.env.TZ;
for (const hostTz of ["UTC", "America/Los_Angeles", "America/New_York", "Europe/London"]) {
  process.env.TZ = hostTz;
  const formatted = fmtPortalDate(sample);
  assert.equal(
    formatted,
    expected,
    `fmtPortalDate must be stable under process TZ=${hostTz} (got ${formatted})`,
  );
}
if (previousTz === undefined) delete process.env.TZ;
else process.env.TZ = previousTz;

assert.equal(fmtPortalDate(null), "—");
assert.equal(fmtPortalDate(undefined), "—");

console.log("verify-portal-date-hydration: ok");
