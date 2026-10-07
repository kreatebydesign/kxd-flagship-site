/**
 * Phase 3 activation origin regression — pure allowlist checks (no DB).
 *
 * Run: npm run verify:partner-portal-phase3-activation-origin
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertPartnerActivationOrigin,
  PARTNER_ACTIVATION_ORIGIN_ERROR,
  PARTNER_ACTIVATION_PRODUCTION_ORIGIN,
  resolvePartnerActivationAllowedOrigins,
} from "../lib/portal/partner/activation-origin";

const ROOT = process.cwd();
let checks = 0;

async function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function req(origin: string | null, extras?: Record<string, string>): Request {
  const headers = new Headers(extras);
  if (origin !== null) headers.set("origin", origin);
  return new Request("https://network.kreatebydesign.com/api/portal/partner/activate/accept", {
    method: "POST",
    headers,
  });
}

async function main() {
  console.log("\nverify-partner-portal-phase3-activation-origin\n");

  await check("production allowlist is only the canonical Network origin", () => {
    const allowed = resolvePartnerActivationAllowedOrigins({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
    });
    assert.deepEqual([...allowed], [PARTNER_ACTIVATION_PRODUCTION_ORIGIN]);
    assert.equal(PARTNER_ACTIVATION_PRODUCTION_ORIGIN, "https://network.kreatebydesign.com");
  });

  await check("https://network.kreatebydesign.com is accepted in production", () => {
    const result = assertPartnerActivationOrigin(
      req("https://network.kreatebydesign.com"),
      { NODE_ENV: "production", VERCEL_ENV: "production" },
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.origin, "https://network.kreatebydesign.com");
    }
  });

  await check("https://evil.example is rejected in production", () => {
    const result = assertPartnerActivationOrigin(req("https://evil.example"), {
      NODE_ENV: "production",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
      assert.equal(result.message, PARTNER_ACTIVATION_ORIGIN_ERROR);
    }
  });

  await check("portal.kreatebydesign.com is rejected for partner activation in production", () => {
    const result = assertPartnerActivationOrigin(
      req("https://portal.kreatebydesign.com"),
      { NODE_ENV: "production" },
    );
    assert.equal(result.ok, false);
  });

  await check("missing Origin is rejected in production", () => {
    const result = assertPartnerActivationOrigin(req(null), {
      NODE_ENV: "production",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.message, PARTNER_ACTIVATION_ORIGIN_ERROR);
  });

  await check("malformed Origin is rejected in production", () => {
    const result = assertPartnerActivationOrigin(req("not-a-valid-origin"), {
      NODE_ENV: "production",
    });
    assert.equal(result.ok, false);
  });

  await check("Origin with path is rejected (no reflection / loose parse)", () => {
    const result = assertPartnerActivationOrigin(
      req("https://network.kreatebydesign.com/portal/partner/activate"),
      { NODE_ENV: "production" },
    );
    assert.equal(result.ok, false);
  });

  await check("suffix / sibling hosts are rejected", () => {
    assert.equal(
      assertPartnerActivationOrigin(
        req("https://network.kreatebydesign.com.evil.example"),
        { NODE_ENV: "production" },
      ).ok,
      false,
    );
    assert.equal(
      assertPartnerActivationOrigin(
        req("https://evil-network.kreatebydesign.com"),
        { NODE_ENV: "production" },
      ).ok,
      false,
    );
  });

  await check("Host/Referer alone cannot bypass missing Origin in production", () => {
    const result = assertPartnerActivationOrigin(
      req(null, {
        host: "network.kreatebydesign.com",
        referer: "https://network.kreatebydesign.com/portal/partner/activate",
      }),
      { NODE_ENV: "production" },
    );
    assert.equal(result.ok, false);
  });

  await check("non-production still allows localhost", () => {
    const allowed = resolvePartnerActivationAllowedOrigins({
      NODE_ENV: "development",
    });
    assert.ok(allowed.includes("http://localhost:3000"));
    assert.ok(allowed.includes("http://127.0.0.1:3000"));
    const result = assertPartnerActivationOrigin(req("http://localhost:3000"), {
      NODE_ENV: "development",
    });
    assert.equal(result.ok, true);
  });

  await check("activate routes use partner activation origin (not portal WebAuthn guard)", () => {
    const accept = readFileSync(
      path.join(ROOT, "app/api/portal/partner/activate/accept/route.ts"),
      "utf8",
    );
    const preview = readFileSync(
      path.join(ROOT, "app/api/portal/partner/activate/preview/route.ts"),
      "utf8",
    );
    assert.ok(accept.includes("assertPartnerActivationOrigin"));
    assert.ok(preview.includes("assertPartnerActivationOrigin"));
    assert.ok(!accept.includes("assertPortalMutatingOrigin"));
    assert.ok(!preview.includes("assertPortalMutatingOrigin"));
    // Origin check runs before token consumption on accept (call sites, not imports).
    const originCallIdx = accept.indexOf("assertPartnerActivationOrigin(req)");
    const acceptCallIdx = accept.indexOf("await acceptPartnerInvitation(");
    assert.ok(originCallIdx >= 0 && acceptCallIdx > originCallIdx);
  });

  await check("portal mutating origin guard file remains unchanged in role", () => {
    const portalOrigin = readFileSync(
      path.join(ROOT, "lib/portal/identity/origin.ts"),
      "utf8",
    );
    assert.ok(portalOrigin.includes("resolveWebAuthnAllowedOrigins"));
    assert.ok(!portalOrigin.includes("NETWORK_HOST"));
    assert.ok(!portalOrigin.includes("assertPartnerActivationOrigin"));
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
