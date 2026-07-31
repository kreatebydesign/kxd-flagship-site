/**
 * Local verification: creating a sales prospect does not create a client.
 * Uses kxd_audit_report_review only. Cleans up the test lead afterward.
 *
 *   npx tsx --env-file=.env.local scripts/verify-proposal-prospect-create.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

function assertLocal(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  const host = new URL(uri).hostname;
  const database = new URL(uri).pathname.replace(/^\//, "").split("?")[0];
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing non-local host: ${host}`);
  }
  if (database !== "kxd_audit_report_review") {
    throw new Error(`Expected kxd_audit_report_review, got ${database}`);
  }
  console.log(`[verify] host=${host} database=${database}`);
}

async function main() {
  assertLocal();
  const payload = await getPayload({ config });
  const marker = `local-prospect-verify-${Date.now()}@localhost.invalid`;
  const company = `Local Prospect Verify ${Date.now()}`;

  const clientsBefore = await payload.count({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "clients" as any,
    overrideAccess: true,
  });

  const created = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    data: {
      companyName: company,
      contactName: "Verify Contact",
      email: marker,
      status: "new",
      source: "proposal-builder-verify",
      notes: "LOCAL VERIFY ONLY",
    },
    overrideAccess: true,
  });

  const clientsAfter = await payload.count({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "clients" as any,
    overrideAccess: true,
  });

  const dup = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    where: {
      and: [
        { email: { equals: marker } },
        { status: { not_in: ["won", "lost"] } },
      ],
    },
    limit: 5,
    overrideAccess: true,
  });

  let passed = 0;
  let failed = 0;
  const check = (label: string, ok: boolean) => {
    if (ok) {
      passed += 1;
      console.log(`  ✓ ${label}`);
    } else {
      failed += 1;
      console.error(`  ✗ ${label}`);
    }
  };

  check("lead created", Boolean(created.id));
  check("client count unchanged", clientsBefore.totalDocs === clientsAfter.totalDocs);
  check("exactly one open lead for marker email", dup.docs.length === 1);

  await payload.delete({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    id: created.id,
    overrideAccess: true,
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
