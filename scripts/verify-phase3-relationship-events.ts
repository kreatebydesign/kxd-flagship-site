/**
 * Phase 3 Batch C — standalone Relationship Events workspace contract checks.
 * Static verification — no DB writes, no Neon, no production mutation.
 *
 * Run: npm run verify:phase3-relationship-events
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
    if (ent.isDirectory()) walkFiles(full, exts, out);
    else if (exts.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function main() {
  console.log("\nPhase 3 Batch C — Relationship Events verification\n");

  const nav = read("components/admin/operations/shared/operations-nav.ts");
  const editionNav = read("lib/editions/navigation.ts");
  const eventsData = read("lib/executive-client-workspace/events-data.ts");
  const listRoute = read("app/api/admin/client-relationship/events/route.ts");
  const detailRoute = read(
    "app/api/admin/client-relationship/events/[id]/route.ts",
  );
  const formOptions = read(
    "app/api/admin/client-relationship/form-options/route.ts",
  );
  const listPage = read("app/admin/operations/events/page.tsx");
  const newPage = read("app/admin/operations/events/new/page.tsx");
  const detailPage = read("app/admin/operations/events/[id]/page.tsx");
  const listScreen = read(
    "components/admin/operations/events/EventsListScreen.tsx",
  );
  const detailScreen = read(
    "components/admin/operations/events/EventDetailScreen.tsx",
  );
  const form = read(
    "components/admin/operations/events/RelationshipEventForm.tsx",
  );
  const panel = read(
    "components/admin/operations/client-workspace/RelationshipIntelligencePanel.tsx",
  );
  const contactsCollection = read("payload/collections/ClientContacts.ts");
  const eventsCollection = read("payload/collections/ClientRelationshipEvents.ts");
  const migrationsIndex = read("migrations/index.ts");

  assert.equal(existsSync(path.join(root, "app/admin/operations/events/page.tsx")), true);
  assert.equal(
    existsSync(path.join(root, "app/admin/operations/events/[id]/page.tsx")),
    true,
  );
  assert.equal(
    existsSync(path.join(root, "app/admin/operations/events/new/page.tsx")),
    true,
  );
  assert.match(listPage, /requirePayloadAdminPage/);
  assert.match(newPage, /requirePayloadAdminPage/);
  assert.match(detailPage, /requirePayloadAdminPage/);
  assert.match(nav, /id:\s*"events"/);
  assert.match(nav, /href:\s*"\/admin\/operations\/events"/);
  assert.match(nav, /label:\s*"Events"/);
  assert.match(editionNav, /events:\s*"portfolio"/);
  // Timeline remains separate — no rename/collision
  assert.match(nav, /id:\s*"timeline"/);
  assert.match(nav, /href:\s*"\/admin\/operations\/timeline"/);
  console.log("  ✔ standalone Events route + Clients nav entry; Timeline unchanged");

  for (const src of [listRoute, detailRoute, formOptions]) {
    assert.match(src, /requirePayloadAdminApi/);
  }
  console.log("  ✔ event APIs require studio operator authorization");

  assert.match(eventsData, /assertContactsBelongToClient/);
  assert.match(eventsData, /do not belong to the selected client/);
  assert.match(eventsData, /delete data\.client/);
  assert.match(eventsData, /internalOnly:\s*true/);
  assert.match(eventsData, /Owning client is immutable/);
  assert.match(listRoute, /createRelationshipEvent\(clientId/);
  assert.match(detailRoute, /updateRelationshipEvent/);
  assert.match(form, /contactIds:\s*\[\]/);
  assert.match(form, /Changing client clears contacts|contactIds:\s*\[\]/);
  console.log("  ✔ client ownership + same-client multi-contact enforcement");

  assert.match(eventsData, /planned|completed|cancelled/);
  assert.match(detailScreen, /Status workflow/);
  assert.match(detailScreen, /No hard delete/);
  assert.doesNotMatch(detailScreen, /method:\s*["']DELETE["']/);
  assert.doesNotMatch(listRoute, /export async function DELETE/);
  assert.doesNotMatch(detailRoute, /export async function DELETE/);
  console.log("  ✔ status workflow uses schema enums; no hard deletion");

  assert.match(panel, /Read-only/);
  assert.match(panel, /\/admin\/operations\/events/);
  assert.doesNotMatch(panel, /\/api\/admin\/client-relationship\/events/);
  assert.match(listScreen, /clientRelationshipHref|tab=relationship/);
  console.log("  ✔ Batch B Relationship tab intact; links to Events workspace");

  assert.match(eventsData, /No activity emission|No Calendar \/ Timeline/);
  assert.doesNotMatch(eventsData, /executive-timeline-events|client-timeline-events/);
  assert.doesNotMatch(eventsData, /google\/calendar|work_schedule_links/);
  for (const dir of ["lib/google/calendar", "lib/scheduling"]) {
    for (const file of walkFiles(path.join(root, dir), new Set([".ts", ".tsx"]))) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(
        src,
        /client-relationship-events|RelationshipEventForm|EventsListScreen/,
      );
    }
  }
  console.log("  ✔ Calendar / Timeline / scheduling remain separate");

  assert.match(contactsCollection, /slug:\s*"client-contacts"/);
  assert.match(eventsCollection, /slug:\s*"client-relationship-events"/);
  const phase3Migrations = readdirSync(path.join(root, "migrations")).filter(
    (f) =>
      f.endsWith(".ts") &&
      f !== "index.ts" &&
      /phase3_client_relationship/.test(f),
  );
  assert.deepEqual(phase3Migrations, [
    "20260727_phase3_client_relationship_intelligence.ts",
  ]);
  assert.match(
    migrationsIndex,
    /20260727_phase3_client_relationship_intelligence/,
  );
  console.log("  ✔ no schema or migration changes");

  const leakRoots = [
    path.join(root, "app/(portal)"),
    path.join(root, "app/(frontend)"),
    path.join(root, "lib/portal"),
    path.join(root, "lib/ces"),
  ];
  const forbidden = [
    "client-relationship-events",
    "ClientRelationshipEvents",
    "EventsListScreen",
    "RelationshipEventForm",
    "contextNotes",
    "followUpNotes",
  ];
  const leaks: string[] = [];
  for (const dir of leakRoots) {
    for (const file of walkFiles(dir, new Set([".ts", ".tsx", ".js", ".mjs"]))) {
      const src = readFileSync(file, "utf8");
      for (const needle of forbidden) {
        if (src.includes(needle)) {
          leaks.push(`${path.relative(root, file)} contains ${needle}`);
        }
      }
    }
  }
  assert.equal(leaks.length, 0, leaks.join("; "));
  console.log("  ✔ portal/public surfaces do not import Batch C event modules/fields");

  // Broader Phase 3 batches after C may exist; this verifier stays Batch-C-scoped.
  assert.doesNotMatch(
    read("docs/PHASE-3-CLIENT-RELATIONSHIP-INTELLIGENCE.md"),
    /Batch F[^\n]*✅ Implemented/,
  );
  console.log("  ✔ no later-phase Batch F marked implemented");

  console.log("\nPhase 3 Batch C Relationship Events verification passed.\n");
}

main();
