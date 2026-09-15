/**
 * Live Account Statement QA against authoritative contract ledger.
 *
 *   npx tsx scripts/inspect-live-account-statements.ts
 *
 * Read-only. Does not record payments or mutate obligations.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadRootEnvLocal() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(scriptDir, "../../../.env.local"), // repo root from worktree/scripts
    path.resolve(scriptDir, "../../.env.local"), // repo root from primary/scripts
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "../../.env.local"),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq);
      let value = trimmed.slice(eq + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
    return envPath;
  }
  return null;
}

const loadedEnv = loadRootEnvLocal();
if (!loadedEnv) {
  console.error("No .env.local found — set DATABASE_URI before running.");
  process.exit(1);
}

const TARGETS = [
  { nameContains: "Platinum Film Workz", label: "Platinum Film Workz" },
  { nameContains: "de Bois Entertainment", label: "de Bois Entertainment" },
] as const;

async function main() {
  process.env.PAYLOAD_MIGRATING = "true";

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const { buildLiveAccountStatement } = await import(
    "../lib/client-command/commercial/build-account-statement"
  );
  const {
    renderAccountStatementPdf,
    validateAccountStatement,
  } = await import("../lib/commercial-documents/account-statement");
  const { formatCents } = await import("../lib/proposal-builder/money");

  const payload = await getPayload({ config });

  for (const target of TARGETS) {
    const clients = await payload.find({
      collection: "clients",
      where: { name: { contains: target.nameContains } },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    });
    const client = clients.docs[0] as
      | {
          id: number;
          name?: string;
          slug?: string;
          primaryContactName?: string;
        }
      | undefined;
    if (!client) {
      console.log(
        `\n${target.label}: CLIENT NOT FOUND (name contains "${target.nameContains}")`,
      );
      continue;
    }
    console.log(
      `\nMatched client id=${client.id} slug=${client.slug ?? "n/a"} name=${client.name ?? "n/a"}`,
    );

    const contracts = await payload.find({
      collection: "contracts",
      where: { client: { equals: client.id } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
      sort: "-updatedAt",
    });

    const statement = buildLiveAccountStatement({
      clientId: Number(client.id),
      clientName: String(client.name ?? target.label),
      clientSlug: client.slug ? String(client.slug) : null,
      contactName: client.primaryContactName
        ? String(client.primaryContactName)
        : null,
      contracts: contracts.docs.map((doc) => ({
        id: Number(doc.id),
        title: String((doc as { title?: string }).title ?? `Agreement ${doc.id}`),
        lifecyclePackage: (doc as { lifecyclePackage?: unknown }).lifecyclePackage,
      })),
    });

    const issues = validateAccountStatement(statement.document);
    console.log(`\n=== ${target.label} (client ${client.id}) ===`);
    console.log(`Statement date: ${statement.statementDate}`);
    console.log(
      `Project original: ${formatCents(statement.document.summary.originalProjectCents)}`,
    );
    console.log(
      `Payments received: ${formatCents(statement.document.summary.accountPaymentsReceivedCents)}`,
    );
    console.log(
      `Outstanding: ${formatCents(statement.document.summary.totalOutstandingCents)}`,
    );
    console.log("Open balances:");
    for (const item of statement.document.openBalances.items) {
      console.log(
        `  - ${item.description}: original ${formatCents(item.originalCents)} | paid ${formatCents(item.paidCents)} | remaining ${formatCents(item.remainingCents)} | ${item.statusLabel}`,
      );
    }
    console.log("Payment history:");
    for (const payment of statement.document.paymentHistory.payments) {
      console.log(
        `  - ${payment.paidOn} ${payment.label}${payment.detail ? ` (${payment.detail})` : ""}: ${formatCents(payment.amountCents)}`,
      );
    }
    console.log(
      `Validation: ${issues.length === 0 ? "PASS" : `FAIL\n  ${issues.join("\n  ")}`}`,
    );

    const { buffer, filename } = await renderAccountStatementPdf(
      statement.document,
    );
    console.log(`PDF: ${filename} (${buffer.byteLength} bytes)`);
  }

  if (typeof payload.destroy === "function") await payload.destroy();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
