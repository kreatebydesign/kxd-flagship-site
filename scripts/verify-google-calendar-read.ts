/**
 * Phase 25C — Google Calendar read foundation verification (offline-safe).
 * Run: npx tsx scripts/verify-google-calendar-read.ts
 *
 * Imports non-server-only modules only, unless VERIFY_GOOGLE_CALENDAR_LIVE=1.
 */

import {
  GoogleCalendarError,
  googleCalendarErrorFromHttp,
} from "../lib/google/calendar/errors.ts";
import {
  GOOGLE_CALENDAR_ENV,
  assertIsoRange,
  getGoogleCalendarConnectionStatus,
  loadGoogleCalendarOAuthConfig,
} from "../lib/google/calendar/validation.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("Phase 25C — Google Calendar read foundation\n");

console.log("1. Config / connection status");
{
  const status = getGoogleCalendarConnectionStatus();
  assert(typeof status.writeEnabled === "boolean", "writeEnabled is boolean");
  assert(
    status.scope.includes("calendar.readonly") ||
      status.scope.includes("calendar.events"),
    "calendar scopes declared",
  );
  assert(Array.isArray(status.missingEnv), "missingEnv is an array");
  console.log(
    `     configured=${status.configured} connected=${status.connected} missing=[${status.missingEnv.join(", ")}]`,
  );
}

console.log("\n2. OAuth config validation");
{
  let threw = false;
  try {
    loadGoogleCalendarOAuthConfig({ requireRefreshToken: true });
  } catch (err) {
    threw = err instanceof GoogleCalendarError && err.code === "invalid_config";
  }
  const status = getGoogleCalendarConnectionStatus();
  if (!status.connected) {
    assert(threw, "missing credentials → invalid_config");
  } else {
    const cfg = loadGoogleCalendarOAuthConfig({ requireRefreshToken: true });
    assert(Boolean(cfg.clientId), "clientId present when connected");
    assert(Boolean(cfg.refreshToken), "refreshToken present when connected");
  }
}

console.log("\n3. Typed HTTP error mapping");
{
  const auth = googleCalendarErrorFromHttp(401, "invalid_grant");
  assert(auth.code === "authentication_failure", "401 → authentication_failure");
  const forbidden = googleCalendarErrorFromHttp(403, "forbidden");
  assert(forbidden.code === "authorization_failure", "403 → authorization_failure");
  const missing = googleCalendarErrorFromHttp(404, "not found");
  assert(missing.code === "calendar_not_found", "404 → calendar_not_found");
  const rate = googleCalendarErrorFromHttp(429, "quota");
  assert(rate.code === "rate_limit" && rate.retryable, "429 → rate_limit retryable");
  const outage = googleCalendarErrorFromHttp(503, "unavailable");
  assert(outage.code === "temporary_outage" && outage.retryable, "503 → temporary_outage");
}

console.log("\n4. Free/busy range validation");
{
  let bad = false;
  try {
    assertIsoRange("2026-07-13T10:00:00Z", "2026-07-13T09:00:00Z");
  } catch (err) {
    bad = err instanceof GoogleCalendarError && err.code === "invalid_request";
  }
  assert(bad, "inverted range rejected");
  assertIsoRange("2026-07-13T10:00:00Z", "2026-07-13T18:00:00Z");
  assert(true, "valid range accepted");
}

console.log("\n5. Env var names");
{
  assert(
    GOOGLE_CALENDAR_ENV.clientId === "GOOGLE_CALENDAR_CLIENT_ID",
    "CLIENT_ID env key",
  );
  assert(
    GOOGLE_CALENDAR_ENV.refreshToken === "GOOGLE_CALENDAR_REFRESH_TOKEN",
    "REFRESH_TOKEN env key",
  );
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);

if (process.env.VERIFY_GOOGLE_CALENDAR_LIVE === "1") {
  console.log("\n6. Live Google calls (VERIFY_GOOGLE_CALENDAR_LIVE=1)");
  const live = await import("../lib/google/calendar/calendars.ts");
  const avail = await import("../lib/google/calendar/availability.ts");
  const tzMod = await import("../lib/google/calendar/timezone.ts");
  try {
    const calendars = await live.listGoogleCalendars({ bypassCache: true });
    assert(calendars.length > 0, `listed ${calendars.length} calendar(s)`);
    const primary = calendars.find((c) => c.primary) ?? calendars[0];
    const tz = await tzMod.resolveGoogleCalendarTimezone(primary.id);
    assert(Boolean(tz), `timezone=${tz}`);
    const now = new Date();
    const later = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const fb = await avail.queryGoogleCalendarFreeBusy({
      calendarIds: [primary.id],
      timeMin: now.toISOString(),
      timeMax: later.toISOString(),
      timeZone: tz,
    });
    assert(fb.calendars.length === 1, "freebusy returned calendar");
    console.log(`     busy blocks next 24h: ${fb.calendars[0].busy.length}`);
  } catch (err) {
    assert(false, `live call failed: ${err instanceof Error ? err.message : String(err)}`);
  }
} else {
  console.log(
    "\n(Skipping live Google calls — set VERIFY_GOOGLE_CALENDAR_LIVE=1 after OAuth connect)",
  );
}

if (failed > 0) process.exit(1);
console.log("\nNo calendar writes. Read foundation OK.");
