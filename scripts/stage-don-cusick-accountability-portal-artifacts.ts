#!/usr/bin/env node
/**
 * Stage finalized Don accountability PDF + ZIP into private portal storage (local / deploy).
 * Does not mutate the source package or financial data.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(
  ROOT,
  "report-output/private/don-cusick-accountability-final-20261115/dc-report",
);
const DEST = path.join(ROOT, "storage/don-your-space-deliverables");

const FILES = [
  "don-cusick-final-accountability-report.pdf",
  "don-cusick-accountability-final.zip",
] as const;

function main() {
  if (!existsSync(SOURCE)) {
    console.error("Source package not found:", SOURCE);
    process.exit(1);
  }
  mkdirSync(DEST, { recursive: true });
  mkdirSync(path.join(DEST, "ownership-verification"), { recursive: true });

  for (const name of FILES) {
    const src = path.join(SOURCE, name);
    if (!existsSync(src)) {
      console.error("Missing:", src);
      process.exit(1);
    }
    copyFileSync(src, path.join(DEST, name));
    console.log("Staged", name);
  }

  const wixSrcDirs = [
    path.join(SOURCE, "supporting/ownership-verification"),
    path.join(SOURCE, "supporting/ownership-verification/source"),
  ];
  const wixDest = path.join(DEST, "ownership-verification");
  const wixCopyMap: Array<{ dest: string; sources: string[] }> = [
    {
      dest: "wix-roles-cusick-motorsports.png",
      sources: [
        "wix-roles-cusick-motorsports.png",
        "wix-roles-cusick-morgan-motorsports.png",
        "wix-roles-cusick-motorsports-otp-otp-carts.png",
      ],
    },
    {
      dest: "wix-roles-on-track-performance.png",
      sources: ["wix-roles-on-track-performance.png"],
    },
    {
      dest: "wix-roles-otp-carts.png",
      sources: ["wix-roles-otp-carts.png"],
    },
  ];
  for (const { dest, sources } of wixCopyMap) {
    let copied = false;
    for (const dir of wixSrcDirs) {
      if (copied) break;
      for (const name of sources) {
        const src = path.join(dir, name);
        if (existsSync(src)) {
          copyFileSync(src, path.join(wixDest, dest));
          console.log("Staged Wix screenshot", dest);
          copied = true;
          break;
        }
      }
    }
  }

  const wixPresent: string[] = [];
  for (const name of [
    "wix-roles-cusick-motorsports.png",
    "wix-roles-on-track-performance.png",
    "wix-roles-otp-carts.png",
  ]) {
    if (existsSync(path.join(DEST, "ownership-verification", name))) {
      wixPresent.push(name);
    }
  }

  writeFileSync(
    path.join(DEST, "deliverable-manifest.json"),
    JSON.stringify(
      {
        stagedAt: new Date().toISOString(),
        source: SOURCE,
        reportPdf: true,
        supportingZip: true,
        wixScreenshots: wixPresent,
        wixScreenshotsComplete:
          wixPresent.length === 3,
        storageProvider: "local",
      },
      null,
      2,
    ),
  );
  console.log("\nDone. Run scripts/verify-don-your-space-portal.ts to validate.");
}

main();