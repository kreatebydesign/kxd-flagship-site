/**
 * QR Generator V1 — focused verification (exact destination encoding + decode).
 * Run: npx --yes tsx scripts/verify-qr-generator-v1.ts
 *
 * Does not call production, does not write to the database.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  generateQr,
  generateQrPng,
  generateQrSvg,
  validateDestinationUrl,
  verifyQrPngMatchesDestination,
} from "../lib/qr";

const ROOT = process.cwd();
const MOBILIZE =
  "https://www.mobilize.us/tracydems/event/1006953/";

let checks = 0;
async function check(label: string, fn: () => void | Promise<void>) {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function assertFileContains(rel: string, needle: string) {
  const full = path.join(ROOT, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  const text = readFileSync(full, "utf8");
  assert.ok(text.includes(needle), `${rel} should contain: ${needle}`);
}

async function main() {
  console.log("\nverify-qr-generator-v1\n");

  await check("architecture surfaces exist", () => {
    assertFileContains("lib/qr/index.ts", "generateQr");
    assertFileContains("lib/qr/validate-url.ts", "destinationUrl");
    assertFileContains("lib/qr/generate.ts", "QRCode.toBuffer");
    assertFileContains("lib/qr/verify.ts", "verifyQrPngMatchesDestination");
    assertFileContains("payload/collections/QrCodes.ts", 'slug: "qr-codes"');
    assertFileContains("migrations/20260826_qr_codes.ts", "qr_codes");
    assertFileContains("migrations/index.ts", "20260826_qr_codes");
    assertFileContains("payload.config.ts", "QrCodes");
    assertFileContains(
      "components/admin/operations/shared/operations-nav.ts",
      "qr-generator",
    );
    assertFileContains(
      "components/admin/operations/shared/operations-nav.ts",
      'label: "Tools"',
    );
    assertFileContains("lib/editions/navigation.ts", '"qr-generator"');
    assertFileContains(
      "app/admin/operations/tools/qr-generator/page.tsx",
      "QrGeneratorScreen",
    );
    assertFileContains("app/api/admin/qr/generate/route.ts", "requirePayloadAdminApi");
    assertFileContains("app/api/admin/qr/download/route.ts", "requirePayloadAdminApi");
    assertFileContains("package.json", "jsqr");
  });

  await check("invalid URLs are rejected", () => {
    assert.equal(validateDestinationUrl("").ok, false);
    assert.equal(validateDestinationUrl("not-a-url").ok, false);
    assert.equal(validateDestinationUrl("ftp://example.com").ok, false);
    assert.equal(validateDestinationUrl("javascript:alert(1)").ok, false);
    assert.equal(validateDestinationUrl(" https://x.com ").ok, true);
  });

  await check("exact destination string is preserved (trailing slash + query)", () => {
    const withQuery =
      "https://www.example.com/path/?utm_source=flyer&ref=abc/";
    const a = validateDestinationUrl(withQuery);
    assert.equal(a.ok, true);
    if (a.ok) assert.equal(a.destinationUrl, withQuery);

    const mobilize = validateDestinationUrl(MOBILIZE);
    assert.equal(mobilize.ok, true);
    if (mobilize.ok) assert.equal(mobilize.destinationUrl, MOBILIZE);

    // Must NOT normalize away the trailing slash via url.href
    assert.notEqual(new URL(MOBILIZE).href.replace(/\/$/, ""), MOBILIZE);
  });

  await check("Mobilize test URL encodes and decodes exactly", async () => {
    const generated = await generateQr({ destinationUrl: MOBILIZE });
    assert.equal(generated.destinationUrl, MOBILIZE);
    assert.ok(generated.pngBuffer.length > 100);
    assert.ok(generated.svgString.includes("<svg"));
    assert.ok(generated.previewDataUrl.startsWith("data:image/png"));

    const verification = await verifyQrPngMatchesDestination(
      generated.pngBuffer,
      MOBILIZE,
    );
    assert.equal(verification.verified, true);
    assert.equal(verification.decodedDestination, MOBILIZE);
    assert.equal(verification.reason, "ok");
  });

  await check("query parameters are preserved through encode/decode", async () => {
    const url =
      "https://www.otpcarts.com/models/4-passenger/?utm_source=flyer&utm_campaign=spring";
    const generated = await generateQr({ destinationUrl: url });
    assert.equal(generated.destinationUrl, url);
    const verification = await verifyQrPngMatchesDestination(
      generated.pngBuffer,
      url,
    );
    assert.equal(verification.verified, true);
    assert.equal(verification.decodedDestination, url);
  });

  await check("trailing slash is preserved through encode/decode", async () => {
    const url = "https://www.kreatebydesign.com/work/";
    const generated = await generateQr({ destinationUrl: url });
    assert.equal(generated.destinationUrl, url);
    const verification = await verifyQrPngMatchesDestination(
      generated.pngBuffer,
      url,
    );
    assert.equal(verification.verified, true);
    assert.equal(verification.decodedDestination, url);
  });

  await check("long URLs generate successfully", async () => {
    const longQuery = "x".repeat(800);
    const url = `https://www.example.com/campaign/?data=${longQuery}`;
    const generated = await generateQr({ destinationUrl: url });
    assert.equal(generated.destinationUrl, url);
    const verification = await verifyQrPngMatchesDestination(
      generated.pngBuffer,
      url,
    );
    assert.equal(verification.verified, true);
    assert.equal(verification.decodedDestination, url);
  });

  await check("PNG and SVG downloads are valid output", async () => {
    const { buffer } = await generateQrPng(MOBILIZE);
    assert.equal(buffer[0], 0x89);
    assert.equal(buffer[1], 0x50); // P
    assert.equal(buffer[2], 0x4e); // N
    assert.equal(buffer[3], 0x47); // G

    const { svg } = await generateQrSvg(MOBILIZE);
    assert.match(svg, /<svg[\s>]/i);
    assert.ok(svg.includes("path") || svg.includes("rect"));
  });

  await check("mismatch verification fails closed", async () => {
    const generated = await generateQr({ destinationUrl: MOBILIZE });
    const verification = await verifyQrPngMatchesDestination(
      generated.pngBuffer,
      "https://www.example.com/different/",
    );
    assert.equal(verification.verified, false);
    assert.equal(verification.decodedDestination, MOBILIZE);
    assert.equal(verification.reason, "mismatch");
  });

  await check("auth guards present on QR APIs and page", () => {
    assertFileContains(
      "app/api/admin/qr/generate/route.ts",
      "requirePayloadAdminApi",
    );
    assertFileContains(
      "app/api/admin/qr/download/route.ts",
      "requirePayloadAdminApi",
    );
    assertFileContains("app/api/admin/qr/route.ts", "requirePayloadAdminApi");
    assertFileContains(
      "app/admin/operations/tools/qr-generator/page.tsx",
      "requireStaffAwarePage",
    );
    // Restricted staff allowlist must NOT include QR tools (operator-only).
    const staffPerms = readFileSync(
      path.join(ROOT, "lib/staff/permissions.ts"),
      "utf8",
    );
    assert.ok(!staffPerms.includes("/admin/operations/tools"));
    assert.ok(!staffPerms.includes("/api/admin/qr"));
  });

  console.log(`\n${checks} checks passed — QR Generator V1 verified.\n`);
  console.log(`Mobilize destination preserved exactly:\n  ${MOBILIZE}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
