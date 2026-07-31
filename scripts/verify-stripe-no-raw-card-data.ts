/**
 * Regression: KXD OS must never construct raw Stripe card PAN/CVC server-side.
 * Scans commercial Stripe + lifecycle scripts/libs for forbidden patterns.
 *
 *   npx tsx scripts/verify-stripe-no-raw-card-data.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  "lib/stripe",
  "lib/proposal-lifecycle",
  "scripts/run-stripe-test-mode-e2e.ts",
  "scripts/verify-lifecycle-stripe-test.ts",
  "scripts/verify-stripe-test-e2e-followup.ts",
  "app/api/stripe",
];

const FORBIDDEN: Array<{ name: string; re: RegExp }> = [
  { name: "classic Visa test PAN 4242…", re: /4242424242424242/ },
  { name: "card.number assignment", re: /card\s*:\s*\{[^}]*\bnumber\s*:/ },
  { name: "exp_month with number field nearby", re: /\bexp_month\s*:\s*\d+/ },
  { name: "exp_year with number field nearby", re: /\bexp_year\s*:\s*\d+/ },
  { name: "cvc field", re: /\bcvc\s*:\s*['"`]?\d{3,4}/ },
  { name: "tokens.create", re: /\.tokens\.create\s*\(/ },
  { name: "paymentMethods.create with card token/PAN", re: /paymentMethods\.create\s*\([\s\S]*?card\s*:\s*\{[\s\S]*?(?:number|token)\s*:/ },
];

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function collectFiles(entry: string, out: string[]): void {
  const abs = join(process.cwd(), entry);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return;
  }
  if (st.isFile()) {
    if (/\.(ts|tsx|js|mjs)$/.test(abs)) out.push(abs);
    return;
  }
  if (!st.isDirectory()) return;
  for (const name of readdirSync(abs)) {
    if (name === "node_modules" || name === ".git") continue;
    collectFiles(join(entry, name), out);
  }
}

function main() {
  console.log("\nStripe raw-card construction regression\n");
  const files: string[] = [];
  for (const root of ROOTS) collectFiles(root, files);

  assert(files.length > 0, "scanned at least one source file");

  for (const rule of FORBIDDEN) {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (rule.re.test(text)) {
        hits.push(file.replace(process.cwd() + "/", ""));
      }
    }
    assert(hits.length === 0, `${rule.name} absent (${hits.join(", ") || "clean"})`);
  }

  // Positive control: pm_card_visa must remain the E2E pay path when present.
  const e2e = readFileSync(
    join(process.cwd(), "scripts/run-stripe-test-mode-e2e.ts"),
    "utf8",
  );
  assert(e2e.includes("pm_card_visa"), "E2E uses pm_card_visa test PaymentMethod");
  assert(!e2e.includes("tok_visa"), "E2E no longer uses tok_visa Tokens path");
  assert(!e2e.includes("paymentMethods.create"), "E2E does not call paymentMethods.create");

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
