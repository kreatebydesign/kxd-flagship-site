/**
 * Phase 3 Batch B — Client Intelligence workspace contract checks.
 * Static verification — no DB writes, no Neon, no production mutation.
 *
 * Run: npm run verify:phase3-client-intelligence
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === ".git" ||
      ent.name === ".tmp"
    ) {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkFiles(full, exts, out);
    } else if (exts.has(path.extname(ent.name))) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  console.log("\nPhase 3 Batch B — Client Intelligence verification\n");

  const theme = read("lib/executive-client-workspace/theme.ts");
  const fetchSrc = read("lib/executive-client-workspace/fetch-client-workspace.ts");
  const contactsData = read("lib/executive-client-workspace/contacts-data.ts");
  const typesSrc = read("lib/executive-client-workspace/relationship-types.ts");
  const tabContent = read(
    "components/admin/operations/client-workspace/WorkspaceTabContent.tsx",
  );
  const tabs = read("components/admin/operations/client-workspace/WorkspaceTabs.tsx");
  const panel = read(
    "components/admin/operations/client-workspace/RelationshipIntelligencePanel.tsx",
  );
  const createRoute = read("app/api/admin/client-relationship/contacts/route.ts");
  const updateRoute = read(
    "app/api/admin/client-relationship/contacts/[id]/route.ts",
  );
  const pageSrc = read("app/admin/operations/clients/[id]/page.tsx");
  const nav = read("components/admin/operations/shared/operations-nav.ts");
  const contactsCollection = read("payload/collections/ClientContacts.ts");
  const eventsCollection = read("payload/collections/ClientRelationshipEvents.ts");
  const migrationsIndex = read("migrations/index.ts");

  assert.match(theme, /id:\s*"relationship"/);
  assert.match(theme, /label:\s*"Relationship"/);
  assert.match(tabContent, /case\s+"relationship"/);
  assert.match(tabs, /RelationshipTab/);
  assert.match(tabs, /RelationshipIntelligencePanel/);
  assert.match(pageSrc, /fetchClientWorkspace/);
  assert.match(pageSrc, /ClientWorkspaceScreen/);
  console.log("  ✔ Client Intelligence integrated into existing Clients workspace (?tab=relationship)");

  assert.match(createRoute, /requirePayloadAdminApi/);
  assert.match(updateRoute, /requirePayloadAdminApi/);
  assert.match(pageSrc, /admin\/operations\/clients/);
  console.log("  ✔ contact mutations require studio operator API auth");

  assert.match(fetchSrc, /collection:\s*"client-contacts"/);
  assert.match(fetchSrc, /collection:\s*"client-relationship-events"/);
  assert.match(fetchSrc, /where:\s*\{\s*client:\s*\{\s*equals:\s*clientId\s*\}\s*\}/);
  assert.match(contactsData, /ownerId !== trustedClientId/);
  assert.match(contactsData, /Never reassigns the client relationship|never accept a client reassignment/i);
  assert.match(createRoute, /createClientContactForClient\(clientId/);
  assert.match(updateRoute, /updateClientContactForClient\(contactId,\s*clientId/);
  console.log("  ✔ contact/event reads and writes are scoped to trusted client context");

  assert.match(contactsData, /client:\s*trustedClientId/);
  assert.match(contactsData, /delete data\.client/);
  assert.match(panel, /clientId,/);
  assert.doesNotMatch(panel, /body\.client\s*=/);
  console.log("  ✔ contact creation derives Client from trusted server context; reassignment blocked");

  assert.match(panel, /Relationship events/);
  assert.match(panel, /Read-only/);
  assert.doesNotMatch(panel, /\/api\/admin\/client-relationship\/events/);
  assert.doesNotMatch(panel, /Add event|Create event|Edit event|Delete event/);
  console.log("  ✔ relationship events remain read-only in Batch B");

  assert.equal(existsSync(path.join(root, "app/admin/operations/events")), false);
  assert.doesNotMatch(nav, /\/admin\/operations\/events/);
  assert.doesNotMatch(nav, /label:\s*"Events"/);
  console.log("  ✔ no global Events workspace or Events navigation added");

  assert.match(typesSrc, /buildRelationshipIntelligenceSummary/);
  assert.doesNotMatch(typesSrc, /healthScore|sentiment|relationshipScore/);
  assert.doesNotMatch(panel, /relationship score|sentiment|AI recommend/i);
  assert.match(panel, /Recent active contact/);
  assert.doesNotMatch(panel, /Primary contact/);
  console.log("  ✔ intelligence summary is facts-only (no scores / invented primary)");

  assert.match(contactsCollection, /slug:\s*"client-contacts"/);
  assert.match(eventsCollection, /slug:\s*"client-relationship-events"/);
  assert.match(
    migrationsIndex,
    /20260727_phase3_client_relationship_intelligence/,
  );
  assert.equal(
    existsSync(
      path.join(
        root,
        "migrations/20260728_phase3_batch_b.ts",
      ),
    ),
    false,
  );
  // No new Phase 3 Batch B migration file beyond the Batch A migration
  const phase3RelationshipMigrations = readdirSync(path.join(root, "migrations")).filter(
    (f) =>
      f.endsWith(".ts") &&
      f !== "index.ts" &&
      /phase3_client_relationship/.test(f),
  );
  assert.deepEqual(phase3RelationshipMigrations, [
    "20260727_phase3_client_relationship_intelligence.ts",
  ]);
  console.log("  ✔ Batch A schema/migration unchanged — no Batch B migration");

  assert.match(contactsData, /Does not emit activity|private fields must not enter broad feeds/i);
  console.log("  ✔ activity/audit emission omitted for private contact fields");

  const leakRoots = [
    path.join(root, "app/(portal)"),
    path.join(root, "app/(frontend)"),
    path.join(root, "lib/portal"),
    path.join(root, "lib/ces"),
  ];
  const leakExts = new Set([".ts", ".tsx", ".js", ".mjs"]);
  const forbidden = [
    "client-contacts",
    "client-relationship-events",
    "ClientContacts",
    "ClientRelationshipEvents",
    "RelationshipIntelligencePanel",
    "dietaryNotes",
    "accessibilityNotes",
    "relationshipNotes",
  ];
  const leaks: string[] = [];
  for (const dir of leakRoots) {
    for (const file of walkFiles(dir, leakExts)) {
      const src = readFileSync(file, "utf8");
      for (const needle of forbidden) {
        if (src.includes(needle)) {
          leaks.push(`${path.relative(root, file)} contains ${needle}`);
        }
      }
    }
  }
  assert.equal(leaks.length, 0, leaks.join("; "));
  console.log("  ✔ portal/public surfaces do not import Batch B relationship modules/fields");

  for (const dir of ["lib/google/calendar", "lib/scheduling"]) {
    for (const file of walkFiles(path.join(root, dir), leakExts)) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(src, /client-relationship-events|client-contacts|RelationshipIntelligence/);
    }
  }
  console.log("  ✔ Timeline/Calendar/scheduling remain separate from Batch B");

  // Batch C–E signals should not exist yet
  assert.equal(existsSync(path.join(root, "app/admin/operations/events")), false);
  assert.doesNotMatch(
    read("components/admin/operations/shared/operations-nav.ts"),
    /operations\/events/,
  );
  console.log("  ✔ Batch C–E surfaces not started");

  console.log("\nPhase 3 Batch B Client Intelligence verification passed.\n");
}

main();
