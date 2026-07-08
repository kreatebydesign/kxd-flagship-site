/**
 * verify-client-launch-readiness.ts
 *
 * Reusable production readiness checklist for any KXD OS client workspace.
 * Run: npm run verify:client-launch -- --client primal-motorsports
 *      npm run verify:client-launch -- --id 1
 *
 * Does not create accounts or mutate data.
 */

import { getPayload } from "payload";
import config from "../payload.config";
import {
  defaultLaunchReadinessEnv,
  isClientLaunchCoreReady,
  isClientLaunchReady,
  loadClientLaunchReadiness,
  loadClientLaunchReadinessBySlug,
} from "../lib/client-launch/readiness";

function statusIcon(ok: boolean): string {
  return ok ? "✔" : "✘";
}

function parseArgs(argv: string[]): { clientSlug?: string; clientId?: number } {
  let clientSlug: string | undefined;
  let clientId: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--client" && argv[i + 1]) {
      clientSlug = argv[++i];
    } else if (arg === "--id" && argv[i + 1]) {
      clientId = Number(argv[++i]);
    }
  }

  return { clientSlug, clientId };
}

async function verifyClientLaunchReadiness() {
  const { clientSlug, clientId } = parseArgs(process.argv.slice(2));

  if (!clientSlug && !clientId) {
    console.error(
      "\nUsage: npm run verify:client-launch -- --client <slug>\n       npm run verify:client-launch -- --id <clientId>\n",
    );
    process.exit(1);
  }

  const payload = await getPayload({ config });
  const env = defaultLaunchReadinessEnv();

  const readiness = clientSlug
    ? await loadClientLaunchReadinessBySlug(payload, clientSlug, env)
    : await loadClientLaunchReadiness(payload, clientId!, env);

  if (!readiness) {
    console.error("\n✘ Client not found.\n");
    process.exit(1);
  }

  console.log("\n── Client Launch Readiness ──\n");
  console.log(`Client:          ${readiness.clientName} (${readiness.clientSlug ?? "—"})`);
  console.log(`Website URL:     ${readiness.websiteUrl ?? "—"}`);
  console.log(
    `CES profile:     ${readiness.cesProfileStatus}${readiness.cesProfileName ? ` · ${readiness.cesProfileName}` : ""}`,
  );
  console.log(
    `Modules:         ${readiness.enabledModules.length ? readiness.enabledModules.join(", ") : "none"}`,
  );
  console.log(
    `Portal users:    ${readiness.activePortalUserCount} active / ${readiness.portalUserCount} total`,
  );
  if (readiness.welcomePendingUserCount > 0) {
    console.log(`Welcome pending: ${readiness.welcomePendingUserCount} user(s)`);
  }
  console.log(`Resend:          ${env.resendConfigured ? "configured" : "NOT configured"}`);
  console.log(`Overall:         ${readiness.overallStatus.toUpperCase()}\n`);

  console.log("Readiness flags:");
  console.log(`  ${statusIcon(readiness.workspaceReady)} workspaceReady`);
  console.log(`  ${statusIcon(readiness.portalReady)} portalReady`);
  console.log(`  ${statusIcon(readiness.usersReady)} usersReady`);
  console.log(`  ${statusIcon(readiness.modulesReady)} modulesReady`);
  console.log(`  ${statusIcon(readiness.welcomeReady)} welcomeReady`);
  console.log(`  ${statusIcon(readiness.reviewReady)} reviewReady`);

  console.log("\nChecklist:");
  for (const step of readiness.checklist) {
    const marker = step.complete ? "✔" : step.requiredForReady ? "✘" : "○";
    console.log(`  ${marker} ${step.label}`);
  }

  const actionable = readiness.blockers.filter(
    (issue) => issue.level !== "info" || !isClientLaunchCoreReady(readiness),
  );

  if (actionable.length > 0) {
    console.log("\nIssues:");
    for (const issue of actionable) {
      if (issue.id === "launch-core-configured" && !isClientLaunchReady(readiness)) continue;
      console.log(`  [${issue.level.toUpperCase()}] ${issue.message}`);
    }
  }

  console.log("");
  process.exit(isClientLaunchCoreReady(readiness) ? 0 : 1);
}

verifyClientLaunchReadiness().catch((err) => {
  console.error("Verify failed:", err);
  process.exit(1);
});
