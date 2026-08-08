/**
 * Read-only experience discovery for any clientId.
 * Does not create/update Payload docs. Does not invite anyone. Does not activate CES.
 *
 *   npx tsx scripts/discover-client-experience-readonly.ts --client-id=14
 */

import { discoverExperienceDependencies } from "../lib/client-command/experience/composer/discover/index.ts";
import { loadExperienceSignals } from "../lib/client-command/experience/composer/signals.ts";
import { loadPayloadEnv, resolveDbTarget, formatDbTarget } from "./lib/payload-db-target.ts";

function parseClientId(argv: string[]): number {
  const flag = argv.find((a) => a.startsWith("--client-id="));
  const value = flag ? flag.slice("--client-id=".length) : argv[2];
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Pass --client-id=<n>");
  }
  return id;
}

async function main() {
  loadPayloadEnv();
  console.error(`[read-only] ${formatDbTarget(resolveDbTarget())}`);
  const clientId = parseClientId(process.argv.slice(2));
  const signals = await loadExperienceSignals(clientId);
  if (!signals) {
    console.error(JSON.stringify({ ok: false, message: "Client not found", clientId }, null, 2));
    process.exit(1);
  }
  const discovery = await discoverExperienceDependencies(clientId, "all");
  console.log(
    JSON.stringify(
      {
        ok: true,
        writes: false,
        imported: false,
        activated: false,
        invited: false,
        client: {
          id: signals.clientId,
          name: signals.clientName,
          slug: signals.clientSlug,
          websiteUrl: signals.websiteUrl,
          primaryDomain: signals.primaryDomain,
          inventoryCount: signals.inventoryCount,
          ga4PropertyId: signals.ga4PropertyId,
          searchConsoleSiteUrl: signals.searchConsoleSiteUrl,
        },
        discovery,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
