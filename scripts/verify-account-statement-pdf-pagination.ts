/**
 * Account Statement PDF pagination + regression QA.
 *
 * Presentation-only. Reads live ledger data (read-only) and renders PDFs.
 * Asserts page counts, no blank trailing pages, and unchanged financial totals.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { composeAccountStatement } from "../lib/commercial-documents/account-statement/compose.ts";
import { renderAccountStatementPdf } from "../lib/commercial-documents/account-statement/export-pdf.tsx";
import type { AccountStatementDocument } from "../lib/commercial-documents/account-statement/types.ts";
import type { InvoiceObligation as LifecycleObligation } from "../lib/proposal-lifecycle/types.ts";

const OUT = "/tmp/kxd-statement-pagination-qa";
const VISUAL =
  "/Users/kxd/Desktop/!WORKSPACE/Kreate by Design/04-Website/kxd-rebuild/public/_tmp-visual-qa";

function neonUri(): string {
  const r = spawnSync(
    "npx",
    [
      "neonctl",
      "connection-string",
      "--project-id",
      "mute-violet-81514071",
      "--org-id",
      "org-odd-haze-95704840",
      "--database-name",
      "neondb",
    ],
    { encoding: "utf8" },
  );
  const uri = r.stdout.trim().split("\n").filter(Boolean).at(-1);
  if (!uri) throw new Error("Failed to resolve Neon connection string");
  return uri;
}

function countPdfPages(pdfPath: string): number {
  const r = spawnSync("magick", ["identify", pdfPath], { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`magick identify failed: ${r.stderr || r.stdout}`);
  }
  const lines = r.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length;
}

function renderPdfPages(pdfPath: string, prefix: string): string[] {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(VISUAL, { recursive: true });
  const pattern = join(OUT, `${prefix}-page.png`);
  const r = spawnSync(
    "magick",
    ["-density", "140", pdfPath, "-quality", "90", pattern],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`magick render failed: ${r.stderr || r.stdout}`);
  }
  const pages = countPdfPages(pdfPath);
  const paths: string[] = [];
  for (let i = 0; i < pages; i += 1) {
    const src =
      pages === 1
        ? (() => {
            // ImageMagick may emit either `prefix-page.png` or `prefix-page-0.png`.
            const a = join(OUT, `${prefix}-page.png`);
            const b = join(OUT, `${prefix}-page-0.png`);
            try {
              statSync(a);
              return a;
            } catch {
              return b;
            }
          })()
        : join(OUT, `${prefix}-page-${i}.png`);
    const dest = join(VISUAL, `${prefix}-page-${i + 1}.png`);
    writeFileSync(dest, readFileSync(src));
    paths.push(dest);
  }
  return paths;
}

function assertNoBlankTrailingPage(pagePaths: string[]): void {
  assert.ok(pagePaths.length >= 1, "expected at least one page");
  const last = pagePaths[pagePaths.length - 1]!;
  const bytes = statSync(last).size;
  // Footer-only orphans were ~4–11KB. A Final Position continuation page
  // is typically ≥15KB and is intentional for multi-page statements.
  assert.ok(
    bytes > 12_000,
    `trailing page appears blank (${bytes} bytes): ${last}`,
  );
}

async function loadClient(clientId: number): Promise<{
  name: string;
  slug: string;
  obligations: LifecycleObligation[];
}> {
  const { default: pg } = await import("pg");
  const c = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const clients = await c.query(
    `select id, name, slug from clients where id=$1`,
    [clientId],
  );
  const contracts = await c.query(
    `select lifecycle_package from contracts where client_id=$1 order by id`,
    [clientId],
  );
  await c.end();
  if (!clients.rows[0]) throw new Error(`client ${clientId} not found`);
  const obligations = contracts.rows.flatMap(
    (r: { lifecycle_package?: { billingPlan?: { obligations?: LifecycleObligation[] } } }) =>
      r.lifecycle_package?.billingPlan?.obligations ?? [],
  );
  return {
    name: clients.rows[0].name as string,
    slug: clients.rows[0].slug as string,
    obligations,
  };
}

async function renderNamed(
  name: string,
  document: AccountStatementDocument,
): Promise<{ pages: number; path: string; pageImages: string[] }> {
  const { buffer, filename } = await renderAccountStatementPdf(document);
  mkdirSync(OUT, { recursive: true });
  const path = join(OUT, filename);
  writeFileSync(path, buffer);
  const pages = countPdfPages(path);
  const pageImages = renderPdfPages(path, name);
  assertNoBlankTrailingPage(pageImages);
  return { pages, path, pageImages };
}

function buildLongSyntheticDoc(): AccountStatementDocument {
  const paymentCount = 28;
  const paymentAmount = 25_000;
  const paymentsReceived = paymentCount * paymentAmount;
  const projectOriginal = paymentsReceived + 200_000;
  const projectBalance = projectOriginal - paymentsReceived;

  const payments = Array.from({ length: paymentCount }, (_, i) => {
    const month = String((i % 12) + 1).padStart(2, "0");
    const day = String((i % 28) + 1).padStart(2, "0");
    return {
      id: `pay-${i + 1}`,
      paidOn: `2025-${month}-${day}`,
      amountCents: paymentAmount as never,
      label: `Synthetic Progress Payment ${i + 1}`,
      detail: `Stripe · Ref syn_test_${i + 1}`,
    };
  });

  const dueItems = Array.from({ length: 8 }, (_, i) => {
    const original = 50_000;
    const paid = i % 3 === 1 ? 10_000 : 0;
    const remaining = original - paid;
    return {
      id: `due-${i + 1}`,
      description: `Open Balance Line ${i + 1}`,
      originalCents: original as never,
      paidCents: paid as never,
      remainingCents: remaining as never,
      dueDate: "2026-09-15",
      statusLabel:
        i % 3 === 0 ? "Past Due" : i % 3 === 1 ? "Partially Paid" : "Due",
      kind: "addon" as const,
      timingNote: null,
    };
  });
  const dueTotal = dueItems.reduce((sum, row) => sum + row.remainingCents, 0);
  const currentCharge = 30_000;

  return {
    id: "long-synthetic",
    title: "Account Statement",
    clientName: "Synthetic Multi-Page Client",
    clientSlug: "synthetic-multi-page",
    contactName: null,
    documentKindLabel: "Statement type",
    documentKindValue: "Account Statement",
    agreementTitle: null,
    statementDate: "2026-09-16",
    currency: "USD",
    summary: {
      originalProjectLabel: "Original Website Design & Development",
      originalProjectCents: projectOriginal as never,
      paymentsReceivedLabel: "Website Project Payments Received",
      paymentsReceivedCents: paymentsReceived as never,
      projectBalanceLabel: "Website Project Balance",
      projectBalanceCents: projectBalance as never,
      currentChargesLabel: "KXD Media Vault — 250 GB",
      currentChargesCents: currentCharge as never,
      currentChargeLines: [
        {
          id: "summary-charge-svc-1",
          label: "KXD Media Vault — 250 GB",
          amountCents: currentCharge as never,
        },
      ],
      totalOutstandingLabel: "Total Currently Due",
      totalOutstandingCents: dueTotal as never,
      accountPaymentsReceivedLabel: "Total Payments Received",
      accountPaymentsReceivedCents: paymentsReceived as never,
    },
    openBalances: {
      sectionTitle: "Currently Due",
      items: dueItems,
      totalRemainingLabel: "Total currently due",
      totalRemainingCents: dueTotal as never,
      upcomingSectionTitle: "Upcoming / Not Yet Due",
      upcomingItems: [
        {
          id: "upcoming-1",
          description: "Future Launch Hosting",
          originalCents: 29_900 as never,
          paidCents: 0 as never,
          remainingCents: 29_900 as never,
          dueDate: null,
          statusLabel: "Upcoming",
          kind: "addon",
          timingNote: "Due at website launch",
        },
      ],
    },
    paymentHistory: {
      sectionTitle: "Payment History",
      payments,
      totalReceivedLabel: "Total Payments Received",
      totalReceivedCents: paymentsReceived as never,
      remainingLabel: "Website project remaining",
      remainingCents: projectBalance as never,
    },
    currentCharges: {
      sectionTitle: "Current Services",
      items: [
        {
          id: "svc-1",
          title: "KXD Media Vault — 250 GB",
          periodLabel: "Annual",
          amountCents: currentCharge as never,
          description: null,
        },
      ],
      subtotalLabel: "Current service charges",
      subtotalCents: currentCharge as never,
      existingInvoiceNote: null,
    },
    finalPosition: {
      sectionTitle: "Final Account Position",
      lines: dueItems.map((d) => ({
        id: d.id,
        label: d.description,
        amountCents: d.remainingCents,
      })),
      totalLabel: "Total Currently Due",
      totalCents: dueTotal as never,
    },
    closingNotes: [],
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const deBois = await loadClient(19);
  const { document: deDoc } = composeAccountStatement({
    id: "debois-pagination",
    clientName: deBois.name,
    clientSlug: deBois.slug,
    statementDate: new Date().toISOString().slice(0, 10),
    obligations: deBois.obligations,
  });

  assert.equal(deDoc.summary.totalOutstandingCents, 230_000);
  assert.equal(deDoc.summary.accountPaymentsReceivedCents, 750_000);
  assert.equal(deDoc.summary.originalProjectCents, 950_000);
  assert.equal(deDoc.summary.projectBalanceCents, 200_000);
  assert.equal(deDoc.summary.currentChargesCents, 30_000);
  assert.equal(deDoc.openBalances.upcomingItems.length, 1);
  assert.equal(deDoc.openBalances.upcomingItems[0]?.remainingCents, 29_900);
  assert.doesNotMatch(JSON.stringify(deDoc), /Pending Trigger/i);
  assert.doesNotMatch(JSON.stringify(deDoc.openBalances), /Management/i);

  const deRender = await renderNamed("debois-statement", deDoc);
  assert.equal(
    deRender.pages,
    1,
    `de Bois must be 1 page, got ${deRender.pages}`,
  );

  const platinum = await loadClient(18);
  const { document: plDoc } = composeAccountStatement({
    id: "platinum-pagination",
    clientName: platinum.name,
    clientSlug: platinum.slug,
    statementDate: new Date().toISOString().slice(0, 10),
    obligations: platinum.obligations,
  });
  assert.equal(plDoc.summary.totalOutstandingCents, 63_519);
  const plRender = await renderNamed("platinum-statement", plDoc);
  assert.ok(plRender.pages >= 1);
  // Platinum has denser payment history; 1–2 intentional pages are acceptable.
  assert.ok(
    plRender.pages <= 2,
    `Platinum unexpectedly long: ${plRender.pages}`,
  );

  const longDoc = buildLongSyntheticDoc();
  const longRender = await renderNamed("long-synthetic-statement", longDoc);
  assert.ok(
    longRender.pages >= 2,
    `synthetic long statement should paginate, got ${longRender.pages}`,
  );

  const report = {
    deBois: {
      pages: deRender.pages,
      outstanding: deDoc.summary.totalOutstandingCents,
      payments: deDoc.summary.accountPaymentsReceivedCents,
      path: deRender.path,
      images: deRender.pageImages,
    },
    platinum: {
      pages: plRender.pages,
      outstanding: plDoc.summary.totalOutstandingCents,
      path: plRender.path,
      images: plRender.pageImages,
    },
    longSynthetic: {
      pages: longRender.pages,
      path: longRender.path,
      images: longRender.pageImages,
    },
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log("ACCOUNT STATEMENT PDF PAGINATION QA PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
