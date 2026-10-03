/**
 * Import / reconcile Primal MotorsportReg calendar into canonical KXD events.
 * Usage:
 *   npx tsx scripts/import-primal-motorsportreg-calendar.ts
 *   APPLY=1 npx tsx scripts/import-primal-motorsportreg-calendar.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { fetchMotorsportRegFeed, listCalendarEventsForClient, reconcileMotorsportRegEvents } from "../lib/calendar/server";

async function main() {
  const apply = process.env.APPLY === "1";
  const payload = await getPayload({ config });
  const clients = await payload.find({
    collection: "clients" as never,
    where: { slug: { equals: "primal-motorsports" } } as never,
    limit: 1,
    overrideAccess: true,
  });
  const client = clients.docs[0] as { id?: number } | undefined;
  if (!client?.id) throw new Error("primal-motorsports client not found");

  const feed = await fetchMotorsportRegFeed();
  console.log(`MotorsportReg feed: ${feed.length} events`);
  for (const row of feed) {
    console.log(`  ${row.startDate}  ${row.id}  ${row.name}  cancelled=${row.cancelled}`);
  }

  if (!apply) {
    console.log("Dry run. Re-run with APPLY=1 to write.");
    process.exit(0);
  }

  const result = await reconcileMotorsportRegEvents(payload, {
    clientId: Number(client.id),
    feed,
    actor: "import:primal-motorsportreg-calendar",
  });
  const stored = await listCalendarEventsForClient(payload, Number(client.id));
  console.log("Reconcile", result);
  console.log(`Stored events: ${stored.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
