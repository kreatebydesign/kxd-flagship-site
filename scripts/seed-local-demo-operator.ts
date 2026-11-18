/**
 * LOCAL ONLY — ensure demo operator in linked SQLite (Batch 1 QA).
 * npx tsx scripts/seed-local-demo-operator.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

const EMAIL = "demo-operator@localhost.invalid";
const PASSWORD = "LocalReview2026!";

async function main() {
  const sqlitePath = process.env.PAYLOAD_SQLITE_PATH?.trim() ?? "";
  const allowShared = process.env.KXD_ALLOW_SHARED_QA_SEED === "1";
  if (
    !allowShared &&
    (!sqlitePath || sqlitePath.includes(".payload/kxd.sqlite"))
  ) {
    console.error(
      "[seed] Refusing to seed shared SQLite. Run scripts/setup-batch1-qa-database.ts or set PAYLOAD_SQLITE_PATH to storage/qa/batch1-nav.sqlite.",
    );
    process.exit(1);
  }

  const payload = await getPayload({ config });
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: EMAIL } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.docs.length > 0) {
    console.log("[seed] Local demo operator already exists.");
    return;
  }
  await payload.create({
    collection: "users",
    data: {
      email: EMAIL,
      password: PASSWORD,
      displayName: "Demo Operator",
      role: "admin",
    },
    overrideAccess: true,
  });
  console.log("[seed] Created local demo operator.");
}

main().catch((err) => {
  console.error("[seed] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});