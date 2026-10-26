/**
 * Database-target Node runtime diagnostic — verify:database-target-node-runtime
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  compareNodeRuntimeVersions,
  CVE_2026_111497_PATCHED_MINIMUM,
  nodeRuntimeMeetsCve2026111497Minimum,
  parseNodeRuntimeVersion,
  resolveNodeRuntimeSecurityFields,
} from "../lib/admin/node-runtime-security";
import { isStudioPayloadOperator } from "../payload/access/index.ts";

const root = path.resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("\nDatabase-target Node runtime — verify:database-target-node-runtime\n");

assert.deepEqual(CVE_2026_111497_PATCHED_MINIMUM[24], [24, 22, 1]);
assert.deepEqual(CVE_2026_111497_PATCHED_MINIMUM[22], [22, 23, 4]);
assert.deepEqual(CVE_2026_111497_PATCHED_MINIMUM[26], [26, 12, 1]);

assert.deepEqual(parseNodeRuntimeVersion("v24.22.1"), [24, 22, 1]);
assert.deepEqual(parseNodeRuntimeVersion("24.22.1"), [24, 22, 1]);
assert.equal(parseNodeRuntimeVersion("not-a-version"), null);

assert.equal(compareNodeRuntimeVersions("v24.22.0", "v24.22.1"), -1);
assert.equal(compareNodeRuntimeVersions("v24.22.1", "v24.22.1"), 0);
assert.equal(compareNodeRuntimeVersions("v24.23.0", "v24.22.1"), 1);
assert.equal(compareNodeRuntimeVersions("v25.0.0", "v24.22.1"), 1);

assert.equal(nodeRuntimeMeetsCve2026111497Minimum("v24.22.0"), false);
assert.equal(nodeRuntimeMeetsCve2026111497Minimum("v24.22.1"), true);
assert.equal(nodeRuntimeMeetsCve2026111497Minimum("v24.22.2"), true);
assert.equal(nodeRuntimeMeetsCve2026111497Minimum("v22.23.3"), false);
assert.equal(nodeRuntimeMeetsCve2026111497Minimum("v22.23.4"), true);
assert.equal(nodeRuntimeMeetsCve2026111497Minimum("v26.12.0"), false);
assert.equal(nodeRuntimeMeetsCve2026111497Minimum("v26.12.1"), true);
assert.equal(nodeRuntimeMeetsCve2026111497Minimum("v20.20.2"), true);

const route = read("app/api/admin/system/database-target/route.ts");
assert.match(route, /requirePayloadAdminApi\(request\)/);
assert.match(route, /isStudioPayloadOperator\(auth\)/);
assert.match(route, /resolveNodeRuntimeSecurityFields/);
assert.match(route, /nodeRuntimeVersion/);
assert.match(route, /nodeRuntimeMeetsCve2026111497Minimum/);
assert.match(route, /Cache-Control.*no-store/);
assert.match(route, /vercelEnv: process\.env\.VERCEL_ENV/);
assert.doesNotMatch(route, /STRIPE_SECRET/);

const tylerPayload = {
  id: 99,
  collection: "users",
  role: "editor",
};
const mattPayload = {
  id: 1,
  collection: "users",
  role: "admin",
};
assert.equal(isStudioPayloadOperator(tylerPayload as never), false);
assert.equal(isStudioPayloadOperator(mattPayload as never), true);

const fields = resolveNodeRuntimeSecurityFields();
assert.match(fields.nodeRuntimeVersion, /^v\d+\.\d+\.\d+/);
assert.equal(
  typeof fields.nodeRuntimeMeetsCve2026111497Minimum,
  "boolean",
);
assert.equal(
  fields.nodeRuntimeMeetsCve2026111497Minimum,
  nodeRuntimeMeetsCve2026111497Minimum(fields.nodeRuntimeVersion),
);

console.log("OK — database-target Node runtime verification passed.\n");
