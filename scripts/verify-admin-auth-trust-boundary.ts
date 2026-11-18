/**
 * R3D-02 — Admin auth trust boundary (localhost + isolated QA only).
 *
 *   QA_BASE_URL=http://localhost:3019 npx tsx scripts/verify-admin-auth-trust-boundary.ts
 */
import assert from "node:assert/strict";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3019").replace(/\/$/, "");
const FOUNDER_EMAIL = process.env.KXD_LOCAL_QA_EMAIL?.trim() || "demo-operator@localhost.invalid";
const STAFF_EMAIL = "qa-bds-restricted@localhost.invalid";
const PASSWORD = process.env.KXD_LOCAL_QA_PASSWORD?.trim() || "LocalReview2026!";
const SPOOF_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OTk5OTksImNvbGxlY3Rpb24iOiJ1c2VycyJ9.spoofed";

type Check = { name: string; pass: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  console.log(pass ? `  ✔ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function loginCookie(email: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) return null;
  return res.headers.get("set-cookie")?.match(/payload-token=([^;]+)/)?.[1] ?? null;
}

async function postCreate(headers: Record<string, string> = {}): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/admin/work/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ title: `[auth-boundary-${Date.now()}]` }),
  });
  return res.status;
}

async function main() {
  const unauth = await postCreate();
  record("Unauthenticated POST create", unauth === 401, `status=${unauth}`);

  const spoofForwardedOnly = await postCreate({
    "x-kxd-forwarded-cookie": `payload-token=${SPOOF_JWT}`,
  });
  record("Spoofed forwarded-cookie only", spoofForwardedOnly === 401, `status=${spoofForwardedOnly}`);

  const spoofBoth = await postCreate({
    Cookie: `payload-token=${SPOOF_JWT}`,
    "x-kxd-forwarded-cookie": `payload-token=${SPOOF_JWT}`,
  });
  record(
    "Spoofed cookie + forwarded header",
    spoofBoth === 401,
    `status=${spoofBoth} (invalid JWT must not authenticate)`,
  );

  const founderToken = await loginCookie(FOUNDER_EMAIL);
  assert.ok(founderToken, "founder login");
  const founderPost = await postCreate({ Cookie: `payload-token=${founderToken}` });
  record("Founder POST create", founderPost === 200, `status=${founderPost}`);

  const staffToken = await loginCookie(STAFF_EMAIL);
  assert.ok(staffToken, "staff login");
  const staffPost = await postCreate({ Cookie: `payload-token=${staffToken}` });
  record(
    "Restricted staff POST create denied",
    staffPost === 401 || staffPost === 403,
    `status=${staffPost}`,
  );

  const failed = checks.filter((c) => !c.pass);
  if (failed.length > 0) {
    console.error(`\nAdmin auth trust boundary: ${failed.length} failed.`);
    process.exit(1);
  }
  console.log("\nAdmin auth trust boundary checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});