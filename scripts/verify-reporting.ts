/**
 * Phase 32B — Shared Core reporting verification suite runner.
 *
 * Runs domain + provider + ingest contract suites (no live Google calls).
 *   npm run verify:reporting
 */

import { spawnSync } from "node:child_process";

const suites = [
  ["npm", ["run", "verify:reporting-domain"]],
  ["npm", ["run", "verify:reporting-providers"]],
  ["npm", ["run", "verify:reporting-ingest"]],
  ["npm", ["run", "verify:reporting-automation"]],
  ["npm", ["run", "verify:reporting-operations"]],
  ["npm", ["run", "verify:executive-panel-metrics"]],
] as const;

function main() {
  console.log("\nPhase 32B — verify:reporting (Shared Core contract suites)\n");
  let failed = 0;
  for (const [cmd, args] of suites) {
    console.log(`→ ${cmd} ${args.join(" ")}`);
    const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
    if (result.status !== 0) {
      failed += 1;
      console.error(`FAIL: ${args.join(" ")}`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} suite(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll reporting contract suites passed.");
}

main();
