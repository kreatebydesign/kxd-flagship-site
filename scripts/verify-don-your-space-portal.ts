#!/usr/bin/env node
/**
 * Local verifier for Don Your Space portal module (no production DB).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import {
  DON_YOUR_SPACE_BUSINESSES,
  DON_PORTFOLIO_FINANCIALS,
} from "../lib/portal/don-your-space/facts";

import { fileURLToPath } from "node:url";
import { DON_WIX_SCREENSHOTS_EXPECTED } from "../lib/portal/don-your-space/constants";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORAGE = path.join(ROOT, "storage/don-your-space-deliverables");

let ok = true;
function check(label: string, pass: boolean) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}`);
  if (!pass) ok = false;
}

const sum = DON_YOUR_SPACE_BUSINESSES.reduce((a, b) => a + b.paymentsUsd, 0);
check("Business allocations sum to $32,174", sum === 32_174);
check("Grand total constant matches", DON_PORTFOLIO_FINANCIALS.grandTotalUsd === 32_174);
check("45 payment records", DON_PORTFOLIO_FINANCIALS.paymentRecordCount === 45);
check("Report PDF staged", existsSync(path.join(STORAGE, "don-cusick-final-accountability-report.pdf")));
check("ZIP staged", existsSync(path.join(STORAGE, "don-cusick-accountability-final.zip")));
check("your-space page exists", existsSync(path.join(ROOT, "app/(portal)/portal/(app)/your-space/page.tsx")));
check("download API exists", existsSync(path.join(ROOT, "app/api/portal/don-your-space/download/route.ts")));
check(
  "blob storage resolve exists",
  existsSync(path.join(ROOT, "lib/portal/don-your-space/storage/resolve.ts")),
);
check(
  "blob upload script exists",
  existsSync(path.join(ROOT, "scripts/upload-don-your-space-deliverables-blob.ts")),
);
check(
  "business detail route exists",
  existsSync(path.join(ROOT, "app/(portal)/portal/(app)/your-space/[slug]/page.tsx")),
);
import { spawnSync } from "node:child_process";

const accessTests = spawnSync(
  "npx",
  ["tsx", "--test", "lib/portal/don-your-space/access.test.ts"],
  { cwd: ROOT, stdio: "inherit" },
);
check("access control unit tests", accessTests.status === 0);

for (const name of DON_WIX_SCREENSHOTS_EXPECTED) {
  check(
    `Wix screenshot staged: ${name}`,
    existsSync(path.join(STORAGE, "ownership-verification", name)),
  );
}

process.exit(ok ? 0 : 1);