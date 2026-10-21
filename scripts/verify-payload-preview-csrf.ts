/**
 * Ensures Vercel Preview hosts are included in Payload CSRF allowlist (cookie POST auth).
 *   npx tsx scripts/verify-payload-preview-csrf.ts
 */
import assert from "node:assert/strict";
import { resolvePayloadCsrfOrigins } from "../lib/payload/csrf-origins.ts";

const previewBranchHost =
  "kxd-flagship-site-git-feature-staff-time-b1-foundation-kxd.vercel.app";

const prev = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
};

process.env.VERCEL_ENV = "preview";
process.env.VERCEL_URL = "kxd-flagship-site-bjbtzptep-kxd.vercel.app";
process.env.VERCEL_BRANCH_URL = previewBranchHost;

const origins = resolvePayloadCsrfOrigins();
const previewOrigin = `https://${previewBranchHost}`;
const deploymentOrigin = "https://kxd-flagship-site-bjbtzptep-kxd.vercel.app";

assert.ok(
  origins.includes(previewOrigin),
  `Expected branch preview origin ${previewOrigin} in csrf list`,
);
assert.ok(
  origins.includes(deploymentOrigin),
  `Expected deployment origin ${deploymentOrigin} in csrf list`,
);

Object.assign(process.env, prev);

console.log("verify-payload-preview-csrf: OK");
