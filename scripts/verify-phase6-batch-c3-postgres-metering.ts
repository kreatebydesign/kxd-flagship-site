/**
 * Phase 6 Batch C3 — real local Postgres concurrency metering proof.
 *
 * Fail-closed unless DATABASE_* points at local Postgres.
 * Run via: npm run verify:phase6-batch-c3 (invokes when local Postgres available)
 * Or:      npm run verify:phase6-batch-c3-metering
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  assertConnectLocalFixtureTarget,
  formatConnectLocalDbTarget,
  resolveConnectLocalDbTarget,
} from "../lib/connect/local-fixture-guard";

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

async function main() {
  console.log("\nPhase 6 Batch C3 — Postgres atomic metering proof\n");

  const target = resolveConnectLocalDbTarget();
  assertConnectLocalFixtureTarget(target);
  check(
    "local database target",
    target.kind === "local-postgres" || target.kind === "sqlite",
    formatConnectLocalDbTarget(target),
  );

  if (target.kind !== "local-postgres") {
    console.log(
      "  ⚠ Skipping concurrency proof — local Postgres required " +
        `(resolved ${formatConnectLocalDbTarget(target)})`,
    );
    process.exit(2);
  }

  const { getPayload } = await import("payload");
  const { default: config } = await import("../payload.config");
  const { bootstrapKxdConnectOrganization } = await import(
    "../lib/connect/bootstrap"
  );
  const { incrementConnectMeter, connectMeterAtomicIncrementAvailable } =
    await import("../lib/connect/metering/service");
  const { connectDailyPeriodKey } = await import(
    "../lib/connect/metering/period"
  );
  const { canUseAtomicConnectMeterIncrement } = await import(
    "../lib/connect/metering/atomic"
  );

  const payload = await getPayload({ config });
  check(
    "atomic Postgres path available",
    connectMeterAtomicIncrementAvailable(payload) &&
      canUseAtomicConnectMeterIncrement(payload),
  );

  const org = await bootstrapKxdConnectOrganization();
  const organizationId = org.organizationId;
  const periodKey = `c3-proof-${connectDailyPeriodKey()}-${randomUUID().slice(0, 8)}`;
  const meterKey = "messages_sent" as const;

  async function readQty(): Promise<number> {
    const { readConnectMeterQuantity } = await import(
      "../lib/connect/metering/service"
    );
    return readConnectMeterQuantity({
      organizationId,
      meterKey,
      periodKind: "daily",
      periodKey,
    });
  }

  // 1) One message-shaped increment
  const key1 = `message:c3-one-${randomUUID()}`;
  const one = await incrementConnectMeter({
    organizationId,
    meterKey,
    delta: 1,
    periodKey,
    idempotencyKey: key1,
    caller: { trustedServerCaller: true },
  });
  check("one increment applies", one.ok === true && one.applied === true);
  check("one increment quantity is 1", (await readQty()) === 1);

  // 2) Retry same key does not double
  const retry = await incrementConnectMeter({
    organizationId,
    meterKey,
    delta: 1,
    periodKey,
    idempotencyKey: key1,
    caller: { trustedServerCaller: true },
  });
  check(
    "retry same idempotency key is duplicate",
    retry.ok === true && retry.duplicate === true && retry.applied === false,
  );
  check("retry did not change quantity", (await readQty()) === 1);

  // 3) Concurrent unique sends
  const uniqueKeys = Array.from(
    { length: 20 },
    (_, i) => `message:c3-concurrent-${randomUUID()}-${i}`,
  );
  const concurrent = await Promise.all(
    uniqueKeys.map((idempotencyKey) =>
      incrementConnectMeter({
        organizationId,
        meterKey,
        delta: 1,
        periodKey,
        idempotencyKey,
        caller: { trustedServerCaller: true },
      }),
    ),
  );
  const appliedUnique = concurrent.filter((r) => r.ok && r.applied).length;
  check("concurrent unique sends all applied", appliedUnique === 20);
  check("concurrent unique total quantity", (await readQty()) === 21);

  // 4) Concurrent retries of same send
  const sharedKey = `message:c3-shared-${randomUUID()}`;
  const sharedResults = await Promise.all(
    Array.from({ length: 15 }, () =>
      incrementConnectMeter({
        organizationId,
        meterKey,
        delta: 1,
        periodKey,
        idempotencyKey: sharedKey,
        caller: { trustedServerCaller: true },
      }),
    ),
  );
  const sharedApplied = sharedResults.filter((r) => r.ok && r.applied).length;
  const sharedDupes = sharedResults.filter((r) => r.ok && r.duplicate).length;
  check("concurrent same-key applied exactly once", sharedApplied === 1);
  check("concurrent same-key duplicates", sharedDupes === 14);
  check("concurrent same-key final quantity", (await readQty()) === 22);

  // 5) Failure recovery — durable-style ensure after "failed" first apply
  const recoverKey = `message:c3-recover-${randomUUID()}`;
  // Simulate durable message already created: metering may be retried.
  const first = await incrementConnectMeter({
    organizationId,
    meterKey,
    delta: 1,
    periodKey,
    idempotencyKey: recoverKey,
    caller: { trustedServerCaller: true },
  });
  check("recovery first apply", first.ok && first.applied);
  // Recoverable retry uses the same idempotency key (durable-message pattern).
  const recoverRetry = await incrementConnectMeter({
    organizationId,
    meterKey,
    delta: 1,
    periodKey,
    idempotencyKey: recoverKey,
    caller: { trustedServerCaller: true },
  });
  check(
    "recovery retry is duplicate",
    recoverRetry.ok === true && recoverRetry.duplicate === true,
  );
  check("recovery retry does not double", (await readQty()) === 23);

  // 6) Cross-org cannot inflate this org meter via wrong org id on read
  const otherOrg = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-organizations" as any,
    data: {
      key: `c3-other-${randomUUID().slice(0, 8)}`,
      name: "C3 Other Org",
      status: "active",
    },
    overrideAccess: true,
  });
  const otherId = Number(otherOrg.id);
  await incrementConnectMeter({
    organizationId: otherId,
    meterKey,
    delta: 5,
    periodKey,
    idempotencyKey: `message:c3-other-${randomUUID()}`,
    caller: { trustedServerCaller: true },
  });
  check(
    "cross-organization meters remain isolated",
    (await readQty()) === 23,
  );

  // Cleanup other org meter noise — disable org (no production impact; local only)
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-organizations" as any,
    id: otherId,
    data: { status: "inactive" },
    overrideAccess: true,
  });

  console.log("\nPostgres metering proof passed.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Postgres metering proof failed:", err);
    process.exit(1);
  });
