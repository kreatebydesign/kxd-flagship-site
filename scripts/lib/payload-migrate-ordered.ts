/**
 * Apply Payload migrations in `migrations/index.ts` export order.
 *
 * Payload CLI `readMigrationFiles` uses `fs.readdirSync(...).sort()`, which is
 * lexicographic — not dependency order. That runs e.g. `phase33a1` before
 * `phase33a_` (because `1` < `_`), breaking empty-database bootstrap.
 *
 * Guarding applies use this module. Do not re-enable `prodMigrations` in
 * payload.config.ts (removed to avoid cold-start migrate hangs on Vercel).
 */

import payload from "payload";
import config from "../../payload.config";
import { migrations } from "../../migrations/index";

export async function applyOrderedMigrations(): Promise<void> {
  process.env.PAYLOAD_MIGRATING = "true";

  console.log(
    `[KXD] Applying ${migrations.length} migrations in migrations/index.ts order`,
  );

  await payload.init({
    config,
    disableOnInit: true,
  });

  if (!payload.db || typeof payload.db.migrate !== "function") {
    throw new Error("Payload database adapter migrate() is unavailable");
  }

  // index.ts order is authoritative. Cast avoids MigrateUpArgs vs Migration typing mismatch.
  await payload.db.migrate({ migrations: migrations as never });
  console.log("[KXD] Ordered migration apply complete");

  // Release pool so CLI scripts can exit (Payload init keeps handles open).
  try {
    if (typeof payload.destroy === "function") {
      await payload.destroy();
    } else if (payload.db && typeof (payload.db as { destroy?: () => Promise<void> }).destroy === "function") {
      await (payload.db as { destroy: () => Promise<void> }).destroy();
    }
  } catch {
    /* best-effort */
  }
}

export function listOrderedMigrationNames(): string[] {
  return migrations.map((m) => m.name);
}
