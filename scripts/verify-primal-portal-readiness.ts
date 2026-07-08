/**
 * verify-primal-portal-readiness.ts
 *
 * Production readiness checklist for Primal Motorsports portal go-live.
 * Run: npm run verify:primal-portal
 *
 * Does not create accounts or mutate data.
 */

import { getPayload } from "payload";
import config from "../payload.config";
import { PRIMAL_CLIENT_SLUG } from "../lib/ces/profile/primal";
import {
  evaluatePortalClientReadiness,
  isResendConfigured,
  type PortalClientReadinessInput,
  type CesProfileStatus,
} from "../lib/portal/readiness";

function statusIcon(ok: boolean): string {
  return ok ? "✔" : "✘";
}

function isPortalUsersMigrationError(error: unknown): boolean {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) parts.push(cause.message);
  } else {
    parts.push(String(error));
  }
  return parts.some((part) => part.includes("portal_users.active"));
}

async function verifyPrimalPortalReadiness() {
  const payload = await getPayload({ config });
  const isProduction = process.env.NODE_ENV === "production";
  const resendConfigured = isResendConfigured();

  const clients = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "clients" as any,
    where: { slug: { equals: PRIMAL_CLIENT_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (clients.docs.length === 0) {
    console.error(`\n✘ Client "${PRIMAL_CLIENT_SLUG}" not found. Run: npm run seed:clients\n`);
    process.exit(1);
  }

  const client = clients.docs[0] as Record<string, unknown>;
  const clientId = client.id as number;

  const [profiles, portalUsersResult] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
    payload
      .find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        where: { client: { equals: clientId } },
        limit: 50,
        depth: 0,
        overrideAccess: true,
      })
      .catch((error: unknown) => {
        if (isPortalUsersMigrationError(error)) {
          return {
            docs: [],
            totalDocs: 0,
            migrationRequired: true as const,
          };
        }
        throw error;
      }),
  ]);

  const portalUsers =
    "migrationRequired" in portalUsersResult
      ? { docs: [], totalDocs: 0 }
      : portalUsersResult;
  const portalUsersMigrationRequired =
    "migrationRequired" in portalUsersResult && portalUsersResult.migrationRequired;

  const profile = profiles.docs[0] as Record<string, unknown> | undefined;
  const cesProfileStatus = (profile?.status as CesProfileStatus | undefined) ?? "none";
  const cesModules = Array.isArray(profile?.enabledModules)
    ? (profile.enabledModules as string[])
    : [];

  const activeUsers = (portalUsers.docs as Record<string, unknown>[]).filter(
    (user) => user.active !== false,
  );

  const input: PortalClientReadinessInput = {
    clientId,
    clientName: String(client.name ?? "Primal Motorsports"),
    clientSlug: PRIMAL_CLIENT_SLUG,
    websiteUrl: client.companyWebsite ? String(client.companyWebsite) : null,
    portalUserCount: portalUsers.totalDocs,
    activePortalUserCount: activeUsers.length,
    cesProfileStatus,
    cesProfileName: profile ? String(profile.profileName ?? "") : null,
    cesModules,
    accentColor: profile?.accentColor ? String(profile.accentColor) : null,
  };

  const result = evaluatePortalClientReadiness(input, {
    resendConfigured,
    isProduction,
  });

  console.log("\n── Primal Motorsports Portal Readiness ──\n");
  console.log(`Client:          ${input.clientName} (${PRIMAL_CLIENT_SLUG})`);
  console.log(`Website URL:     ${input.websiteUrl ?? "—"}`);
  console.log(`CES profile:     ${cesProfileStatus}${profile ? ` · ${input.cesProfileName}` : ""}`);
  console.log(`Accent:          ${input.accentColor ?? "—"}`);
  console.log(`Modules:         ${cesModules.length ? cesModules.join(", ") : "none"}`);
  console.log(`Portal users:    ${activeUsers.length} active / ${portalUsers.totalDocs} total`);
  if (portalUsersMigrationRequired) {
    console.log("                 ⚠ portal_users.active migration not applied — run: printf 'y\\n' | npm run migrate");
  }
  console.log(`Resend:          ${resendConfigured ? "configured" : "NOT configured"}`);
  console.log(`Overall:         ${result.ready ? "READY (core config)" : "NOT READY"}\n`);

  console.log("Checklist:");
  console.log(
    `  ${statusIcon(Boolean(input.clientName))} Client name: ${input.clientName}`,
  );
  console.log(`  ${statusIcon(input.clientSlug === PRIMAL_CLIENT_SLUG)} Client slug: ${PRIMAL_CLIENT_SLUG}`);
  console.log(
    `  ${statusIcon(Boolean(input.websiteUrl))} companyWebsite: ${input.websiteUrl ?? "missing"}`,
  );
  console.log(
    `  ${statusIcon(cesProfileStatus === "active")} CES profile active: ${cesProfileStatus}`,
  );
  console.log(
    `  ${statusIcon(cesModules.includes("website-review"))} Website Review enabled`,
  );
  console.log(
    `  ${statusIcon(Boolean(input.accentColor))} Brand accent: ${input.accentColor ?? "missing"}`,
  );
  console.log(
    `  ${statusIcon(activeUsers.length > 0)} Active portal users: ${activeUsers.length}`,
  );
  console.log(
    `  ${statusIcon(resendConfigured || !isProduction)} Password reset email (Resend): ${
      resendConfigured ? "ok" : isProduction ? "missing RESEND_API_KEY" : "dev — link logs to console"
    }`,
  );

  if (result.issues.length > 0) {
    console.log("\nIssues:");
    for (const issue of result.issues) {
      if (issue.id === "portal-ready-core" && !result.ready) continue;
      console.log(`  [${issue.level.toUpperCase()}] ${issue.message}`);
    }
  }

  console.log("\nNext steps:");
  if (!result.ready) {
    console.log("  1. npm run seed:clients");
    console.log("  2. npm run seed:primal-experience");
    console.log("  3. printf 'y\\n' | npm run migrate");
  }
  if (portalUsersMigrationRequired) {
    console.log("  · Apply migrations: printf 'y\\n' | npm run migrate");
  }
  if (activeUsers.length === 0 && !portalUsersMigrationRequired) {
    console.log("  · Create Adam and Tyler at /admin/operations/portal-access");
  }
  if (!resendConfigured && isProduction) {
    console.log("  · Set RESEND_API_KEY and RESEND_FROM_EMAIL in production env");
  }
  console.log("");

  process.exit(result.ready ? 0 : 1);
}

verifyPrimalPortalReadiness().catch((err) => {
  console.error("Verify failed:", err);
  process.exit(1);
});
