/**
 * Platinum Film Workz — controlled Growth $325 recurring commercial amendment.
 *
 * Default: DRY RUN (no production write).
 * Write: CONFIRM_PLATINUM_GROWTH_AMENDMENT=platinum-film-workz-growth-325-2026-09-01
 *
 * Scope: contract 2 lifecyclePackage.commercialAmendments.recurringService
 *        + structuredPaymentTerms recurring overlay + monthly_amount
 * Does NOT: mutate acceptedSnapshot, regenerate signed body, create obligations,
 *           touch Stripe, allocate payments, create October periods.
 */
import pg from "pg";
import {
  isPlatinumGrowthRecurringAmendmentPresent,
  PLATINUM_GROWTH_AMOUNT_CENTS,
  PLATINUM_GROWTH_EFFECTIVE_DATE,
  PLATINUM_GROWTH_TITLE,
  supersedePlatinumRecurringWithGrowth,
} from "../lib/proposal-lifecycle/commercial-amendments.ts";
import { previewRecurringObligationsThroughDate } from "../lib/proposal-lifecycle/ensure-recurring-obligations.ts";
import { normalizeLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import {
  isPlatinumGrowthStructuredTermsPresent,
  overlayStructuredTermsWithRecurringService,
} from "../lib/proposal-lifecycle/platinum-growth-recurring-overlay.ts";
import { ensurePostAcceptanceMaterializationOnPackage } from "../lib/proposal-lifecycle/post-acceptance-materialization.ts";
import { resolveRecurringAuthority } from "../lib/proposal-lifecycle/recurring-authority.ts";
import type { ContractLifecyclePackage } from "../lib/proposal-lifecycle/types.ts";

const CONFIRM = "platinum-film-workz-growth-325-2026-09-01";
const WRITE = process.env.CONFIRM_PLATINUM_GROWTH_AMENDMENT === CONFIRM;

function summarizeAuthority(pkg: ContractLifecyclePackage) {
  const auth = resolveRecurringAuthority(pkg);
  return {
    services: auth.services.map((s) => ({
      title: s.title,
      amountCents: s.amountCents,
      effectiveDate: s.effectiveDate,
      activationStatus: s.activationStatus,
      source: s.source,
    })),
    conflicts: auth.conflicts.map((c) => ({ code: c.code, message: c.message })),
    conflictCount: auth.conflicts.length,
  };
}

function paymentFingerprint(pkg: ContractLifecyclePackage) {
  const obligations = pkg.billingPlan?.obligations ?? [];
  return {
    paidSumCents: obligations.reduce((s, o) => s + Number(o.amountPaidCents || 0), 0),
    paymentEventsCount: obligations.reduce(
      (s, o) => s + ((o.paymentEvents || []).length),
      0,
    ),
    recurringPeriods: obligations
      .filter((o) => o.kind === "recurring-period")
      .map((o) => ({
        id: o.id,
        label: o.label,
        amountCents: o.amountCents,
        dueDate: o.dueDate,
        sourceKey: o.sourceKey,
        serviceTitle: o.serviceTitle,
        amountPaidCents: o.amountPaidCents,
        status: o.status,
      })),
  };
}

async function main() {
  const uri = (process.env.DATABASE_URI || process.env.DATABASE_URL || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!uri || !/neon\.tech/i.test(uri)) {
    throw new Error("Set DATABASE_URI to Neon production.");
  }

  const client = new pg.Client({ connectionString: uri, connectionTimeoutMillis: 20000 });
  await client.connect();

  const { rows } = await client.query(`
    SELECT
      c.id AS contract_id,
      c.status AS contract_status,
      c.client_id,
      cl.name AS client_name,
      cl.primary_contact_name,
      c.monthly_amount::text AS monthly_amount,
      c.lifecycle_package,
      p.accepted_snapshot->'totals' AS accepted_totals,
      p.accepted_snapshot->'primaryContact' AS accepted_contact,
      (p.accepted_snapshot->'totals'->>'oneTimeTotalCents') AS accepted_one_time,
      (p.accepted_snapshot->'totals'->>'monthlyTotalCents') AS accepted_monthly
    FROM contracts c
    JOIN clients cl ON cl.id = c.client_id
    JOIN proposals p ON p.id = 2
    WHERE c.id = 2
  `);
  const row = rows[0];
  if (!row) throw new Error("Platinum contract 2 not found");
  if (!String(row.client_name).toLowerCase().includes("platinum")) {
    throw new Error(`client safety failed: ${row.client_name}`);
  }
  if (Number(row.accepted_one_time) !== 250_000) {
    throw new Error(`accepted one-time changed: ${row.accepted_one_time}`);
  }

  const beforePkg = normalizeLifecyclePackage(row.lifecycle_package);
  if (!beforePkg.commercialAmendments) {
    throw new Error("missing commercialAmendments");
  }
  if (!beforePkg.structuredPaymentTerms) {
    throw new Error("missing structuredPaymentTerms");
  }

  const beforeAuthority = summarizeAuthority(beforePkg);
  const beforePayments = paymentFingerprint(beforePkg);
  const beforeAmendmentsJson = JSON.stringify(beforePkg.commercialAmendments);

  const supersession = supersedePlatinumRecurringWithGrowth(beforePkg.commercialAmendments, {
    recordedBy: "operator-script:platinum-growth-recurring-amendment",
  });

  let nextPkg: ContractLifecyclePackage = {
    ...beforePkg,
    commercialAmendments: supersession.amendments,
  };

  if (
    supersession.status === "applied" ||
    !isPlatinumGrowthStructuredTermsPresent(beforePkg.structuredPaymentTerms)
  ) {
    nextPkg = {
      ...nextPkg,
      structuredPaymentTerms: overlayStructuredTermsWithRecurringService(
        beforePkg.structuredPaymentTerms,
        supersession.amendments.recurringService!,
      ),
    };
  }

  const audit = Array.isArray(nextPkg.auditEvents) ? [...nextPkg.auditEvents] : [];
  const alreadyAudited = audit.some(
    (e) =>
      e &&
      typeof e === "object" &&
      (e as { action?: string }).action ===
        "contract.recurring-superseded-growth-325-2026-09-01",
  );
  if (supersession.status === "applied" && !alreadyAudited) {
    audit.push({
      id: `aud_${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor: "operator-script:platinum-growth-recurring-amendment",
      action: "contract.recurring-superseded-growth-325-2026-09-01",
      fromStatus: row.contract_status,
      toStatus: row.contract_status,
      reason: `Supersede ${supersession.priorRecurringTitle || "prior recurring"} with ${PLATINUM_GROWTH_TITLE} $${(Number(PLATINUM_GROWTH_AMOUNT_CENTS) / 100).toFixed(2)}/month effective ${PLATINUM_GROWTH_EFFECTIVE_DATE}.`,
    });
    nextPkg = { ...nextPkg, auditEvents: audit };
  }

  const afterAuthority = summarizeAuthority(nextPkg);
  const afterPayments = paymentFingerprint(nextPkg);
  const octPreview = previewRecurringObligationsThroughDate(nextPkg, "2026-10-31");
  const batchD = ensurePostAcceptanceMaterializationOnPackage({
    pkg: nextPkg,
    contractStatus: row.contract_status,
    contractId: 2,
    proposalId: 2,
    proposalNumber: "KXD-P-2026-0002",
    clientId: row.client_id,
    clientName: row.client_name,
    actor: "platinum-growth-dry-run",
    now: new Date().toISOString(),
  });

  const dryRunReport = {
    mode: WRITE ? "WRITE" : "DRY_RUN",
    client: row.client_name,
    contact: row.primary_contact_name,
    acceptedContact: row.accepted_contact,
    contractStatus: row.contract_status,
    supersessionStatus: supersession.status,
    beforeAuthority,
    proposedAmendment: supersession.amendments.recurringService,
    afterAuthority,
    septemberObligations: afterPayments.recurringPeriods.filter((o) =>
      String(o.dueDate || "").startsWith("2026-09"),
    ),
    octoberCreatedByThisReconciliation: false,
    octoberEligiblePreview: {
      createdCount: octPreview.createdCount,
      created: octPreview.created.map((o) => ({
        amountCents: o.amountCents,
        sourceKey: o.sourceKey,
        serviceTitle: o.serviceTitle,
      })),
    },
    paymentIntegrity: {
      before: beforePayments,
      after: afterPayments,
      paidUnchanged: beforePayments.paidSumCents === afterPayments.paidSumCents,
      eventsUnchanged:
        beforePayments.paymentEventsCount === afterPayments.paymentEventsCount,
    },
    batchDDryRun: {
      conflictCount: (batchD.conflicts || []).length,
      conflicts: batchD.conflicts,
      warningCount: (batchD.warnings || []).length,
    },
    acceptedSnapshotUntouched: {
      oneTimeTotalCents: row.accepted_one_time,
      monthlyTotalCents: row.accepted_monthly,
    },
    amendmentsJsonUnchangedIfAlreadyPresent:
      supersession.status === "already-present" &&
      beforeAmendmentsJson === JSON.stringify(supersession.amendments),
    growthPresent: isPlatinumGrowthRecurringAmendmentPresent(supersession.amendments),
  };

  const clean =
    afterAuthority.conflictCount === 0 &&
    afterAuthority.services[0]?.title === PLATINUM_GROWTH_TITLE &&
    afterAuthority.services[0]?.amountCents === Number(PLATINUM_GROWTH_AMOUNT_CENTS) &&
    dryRunReport.septemberObligations.length === 1 &&
    dryRunReport.septemberObligations[0]?.amountCents === 32_500 &&
    dryRunReport.paymentIntegrity.paidUnchanged &&
    dryRunReport.paymentIntegrity.eventsUnchanged &&
    (batchD.conflicts || []).length === 0;

  if (!clean) {
    console.log(JSON.stringify({ ok: false, dryRunReport }, null, 2));
    throw new Error("DRY RUN NOT CLEAN — production write blocked");
  }

  if (!WRITE) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          message:
            "DRY RUN CLEAN — set CONFIRM_PLATINUM_GROWTH_AMENDMENT=platinum-film-workz-growth-325-2026-09-01 to write",
          dryRunReport,
        },
        null,
        2,
      ),
    );
    await client.end();
    return;
  }

  if (supersession.status === "already-present") {
    // Still ensure structured terms overlay if somehow lagging.
    if (!isPlatinumGrowthStructuredTermsPresent(beforePkg.structuredPaymentTerms)) {
      await client.query("BEGIN");
      const upd = await client.query(
        `UPDATE contracts SET
           lifecycle_package = $1::jsonb,
           monthly_amount = $2,
           updated_at = NOW()
         WHERE id = 2 AND client_id = $3
         RETURNING id, monthly_amount::text,
           lifecycle_package->'commercialAmendments'->'recurringService'->>'title' AS title,
           lifecycle_package->'commercialAmendments'->'recurringService'->>'amountCents' AS amount`,
        [JSON.stringify(nextPkg), Number(PLATINUM_GROWTH_AMOUNT_CENTS) / 100, row.client_id],
      );
      if (upd.rowCount !== 1) {
        await client.query("ROLLBACK");
        throw new Error("structured-terms sync update failed");
      }
      await client.query("COMMIT");
      console.log(
        JSON.stringify(
          { ok: true, status: "already-present-terms-synced", contract: upd.rows[0] },
          null,
          2,
        ),
      );
      await client.end();
      return;
    }
    console.log(JSON.stringify({ ok: true, status: "already-present" }, null, 2));
    await client.end();
    return;
  }

  await client.query("BEGIN");
  const upd = await client.query(
    `UPDATE contracts SET
       lifecycle_package = $1::jsonb,
       monthly_amount = $2,
       updated_at = NOW()
     WHERE id = 2
       AND client_id = $3
       AND status = $4
     RETURNING id, status, monthly_amount::text,
       lifecycle_package->'commercialAmendments'->'recurringService'->>'title' AS title,
       lifecycle_package->'commercialAmendments'->'recurringService'->>'amountCents' AS amount,
       lifecycle_package->'commercialAmendments'->'recurringService'->>'startBillingDate' AS effective,
       lifecycle_package->'structuredPaymentTerms'->>'monthlyTotalCents' AS terms_monthly`,
    [
      JSON.stringify(nextPkg),
      Number(PLATINUM_GROWTH_AMOUNT_CENTS) / 100,
      row.client_id,
      row.contract_status,
    ],
  );
  if (upd.rowCount !== 1) {
    await client.query("ROLLBACK");
    throw new Error("production update failed");
  }

  const snap = await client.query(
    `SELECT
       (accepted_snapshot->'totals'->>'oneTimeTotalCents') AS one_time,
       (accepted_snapshot->'totals'->>'monthlyTotalCents') AS monthly
     FROM proposals WHERE id = 2`,
  );
  if (snap.rows[0].one_time !== "250000" || snap.rows[0].monthly !== "0") {
    await client.query("ROLLBACK");
    throw new Error("acceptedSnapshot integrity failed");
  }

  // Ensure obligations / payment events unchanged.
  const afterRow = await client.query(
    `SELECT lifecycle_package FROM contracts WHERE id = 2`,
  );
  const written = normalizeLifecyclePackage(afterRow.rows[0].lifecycle_package);
  const writtenPayments = paymentFingerprint(written);
  if (
    writtenPayments.paidSumCents !== beforePayments.paidSumCents ||
    writtenPayments.paymentEventsCount !== beforePayments.paymentEventsCount ||
    writtenPayments.recurringPeriods.length !== beforePayments.recurringPeriods.length
  ) {
    await client.query("ROLLBACK");
    throw new Error("payment/obligation integrity failed after write");
  }

  await client.query("COMMIT");
  console.log(
    JSON.stringify(
      {
        ok: true,
        status: "applied",
        contract: upd.rows[0],
        proposalAccepted: snap.rows[0],
        afterAuthority: summarizeAuthority(written),
        payments: writtenPayments,
      },
      null,
      2,
    ),
  );
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
