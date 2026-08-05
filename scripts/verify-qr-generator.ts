/**
 * Exact-URL integrity checks for the internal QR Generator.
 * Validates preservation rules and decodes generated PNG QR codes with jsQR.
 */

import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  buildQrFilenameBase,
  prepareQrUrlInput,
  readQrEncodedPayload,
  renderQrPngBuffer,
  renderQrSvg,
  validateQrUrl,
} from "../lib/tools/qr-generator";

let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function decodePngBuffer(buffer: Buffer): Promise<string | null> {
  const png = PNG.sync.read(buffer);
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, {
    inversionAttempts: "dontInvert",
  });
  return result?.data ?? null;
}

const VALID_CASES = [
  "https://kreatebydesign.com/contact",
  "https://kreatebydesign.com/contact?utm_source=print&ref=1",
  "https://kreatebydesign.com/contact#team",
  "https://kreatebydesign.com/contact/",
  "https://kreatebydesign.com/ContactPath",
  "https://kreatebydesign.com/path%20with%20space",
] as const;

const INVALID_CASES: Array<{ raw: string; reason: string }> = [
  { raw: "not a url", reason: "invalid text" },
  { raw: "javascript:alert(1)", reason: "javascript protocol" },
  { raw: "data:text/html;base64,AAAA", reason: "data protocol" },
  { raw: "ftp://example.com/file", reason: "ftp protocol" },
  { raw: "", reason: "empty" },
];

async function main() {
  console.log("\nQR Generator exact-URL verification\n");

  check(
    "trim outer whitespace only",
    prepareQrUrlInput("  https://kreatebydesign.com/contact  ") ===
      "https://kreatebydesign.com/contact",
  );

  for (const url of VALID_CASES) {
    console.log(`\nValid case: ${url}`);
    const validated = validateQrUrl(`  ${url}  `);
    check("validation accepts", validated.ok === true);
    if (!validated.ok) continue;
    check("exact URL preserved after trim", validated.url === url);

    const options = {
      exactUrl: validated.url,
      size: 512,
      margin: 2,
      foreground: "#111111",
      background: "#ffffff",
    };

    const [png, svg] = await Promise.all([
      renderQrPngBuffer(options),
      renderQrSvg(options),
    ]);

    check("PNG buffer produced", png.length > 100);
    check("SVG produced", svg.includes("<svg") && svg.length > 100);
    check(
      "QR matrix payload equals exact input",
      readQrEncodedPayload(validated.url) === url,
    );

    const decoded = await decodePngBuffer(png);
    check(
      "decoded PNG equals exact input",
      decoded === url,
      decoded ? `decoded=${decoded}` : "decode failed",
    );

    const base = buildQrFilenameBase(url, new Date("2026-08-04T12:00:00Z"));
    check(
      "filename is helpful and safe",
      /^kxd-qr-[a-z0-9._-]+-20260804$/.test(base),
      base,
    );
  }

  console.log("\nInvalid / unsafe cases");
  for (const item of INVALID_CASES) {
    const validated = validateQrUrl(item.raw);
    check(
      `rejects ${item.reason}`,
      validated.ok === false,
      item.raw || "(empty)",
    );
  }

  // Mixed-case path must not be lowercased by validation
  const mixed = "https://Example.COM/ContactPath";
  const mixedResult = validateQrUrl(mixed);
  check(
    "does not rewrite mixed-case host/path via validation return",
    mixedResult.ok && mixedResult.url === mixed,
  );

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed\n`);
    process.exit(1);
  }
  console.log("\nAll QR Generator checks passed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
