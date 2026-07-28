/**
 * Phase 3 Batch E — Client Relationship Intelligence completion verifier.
 * Static source assertions: privacy, auth, isolation, A–D regression, separation.
 * No database mutations.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isStaffAllowedApiPath,
  isStaffAllowedPagePath,
} from "../lib/staff/permissions";
import { staffActorFromUser } from "../lib/staff/actor";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(full, exts, out);
    } else if (exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  console.log("\nPhase 3 Batch E — Relationship Intelligence completion verification\n");

  const contactsCollection = read("payload/collections/ClientContacts.ts");
  const eventsCollection = read("payload/collections/ClientRelationshipEvents.ts");
  const access = read("payload/access/index.ts");
  const eventsData = read("lib/executive-client-workspace/events-data.ts");
  const contactsData = read("lib/executive-client-workspace/contacts-data.ts");
  const fetchWorkspace = read(
    "lib/executive-client-workspace/fetch-client-workspace.ts",
  );
  const eventsListRoute = read("app/api/admin/client-relationship/events/route.ts");
  const eventsDetailRoute = read(
    "app/api/admin/client-relationship/events/[id]/route.ts",
  );
  const contactsRoute = read("app/api/admin/client-relationship/contacts/route.ts");
  const contactsPatchRoute = read(
    "app/api/admin/client-relationship/contacts/[id]/route.ts",
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
  const panel = read(
    "components/admin/operations/client-workspace/RelationshipIntelligencePanel.tsx",
  );
  const portfolio = read(
    "components/admin/operations/client-portfolio/ClientPortfolioScreen.tsx",
  );
  const nav = read("components/admin/operations/shared/operations-nav.ts");
  const shell = read("components/admin/operations/shared/OperationsShell.tsx");
  const permissions = read("lib/staff/permissions.ts");
  const editions = read("lib/editions/navigation.ts");
  const opsLayout = read("app/admin/operations/layout.tsx");
  const phaseDoc = read("docs/PHASE-3-CLIENT-RELATIONSHIP-INTELLIGENCE.md");
  const migrationsIndex = read("migrations/index.ts");

  // --- Pages / APIs authorization ---
  for (const src of [listPage, newPage, detailPage]) {
    assert.match(src, /requirePayloadAdminPage/);
  }
  for (const src of [
    eventsListRoute,
    eventsDetailRoute,
    contactsRoute,
    contactsPatchRoute,
    formOptions,
  ]) {
    assert.match(src, /requirePayloadAdminApi/);
  }
  assert.match(opsLayout, /requireStaffAwarePage/);
  console.log("  ✔ relationship pages/APIs use operator auth gates");

  // --- Restricted staff denial ---
  const heather = staffActorFromUser({
    id: 42,
    email: "heather@kreatebydesign.com",
    displayName: "Heather",
    role: "editor",
    staffRole: "operations_coordinator",
    staffOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.ok(heather);
  assert.equal(isStaffAllowedPagePath("/admin/operations/events", heather), false);
  assert.equal(isStaffAllowedPagePath("/admin/operations/events/new", heather), false);
  assert.equal(isStaffAllowedPagePath("/admin/operations/clients/9", heather), false);
  assert.equal(
    isStaffAllowedApiPath("/api/admin/client-relationship/events", heather),
    false,
  );
  assert.equal(
    isStaffAllowedApiPath("/api/admin/client-relationship/contacts", heather),
    false,
  );
  assert.doesNotMatch(shell, /STAFF_NAV_GROUPS[\s\S]*?\/admin\/operations\/events/);
  assert.match(permissions, /Phase 3 relationship surfaces stay off this allowlist/);
  console.log("  ✔ restricted staff denied on pages, APIs, and staff nav");

  // --- Collection / field access ---
  assert.match(contactsCollection, /access:\s*\{[\s\S]*read:\s*isAuthenticated/);
  assert.match(eventsCollection, /access:\s*\{[\s\S]*read:\s*isAuthenticated/);
  assert.match(contactsCollection, /studioOperatorFieldAccess/);
  assert.match(eventsCollection, /studioOperatorFieldAccess/);
  assert.match(access, /isStudioPayloadOperator|isRestrictedStaff/);
  console.log("  ✔ Batch A collection and sensitive field access intact");

  // --- Ownership / isolation / internalOnly ---
  assert.match(eventsData, /delete data\.client/);
  assert.match(eventsData, /assertContactsBelongToClient/);
  assert.match(eventsData, /internalOnly:\s*true/);
  assert.match(contactsData, /internalOnly:\s*true/);
  assert.match(contactsData, /delete data\.client/);
  assert.match(eventsData, /EventNotFoundError/);
  assert.match(contactsData, /ContactNotFoundError/);
  assert.match(newPage, /never trusted|validates ownership server-side/i);
  console.log("  ✔ ownership, same-client contacts, internalOnly, forged-ID handling");

  // --- Privacy hardening (Batch E) ---
  assert.match(eventsData, /includePrivateNotes:\s*false/);
  assert.match(eventsData, /List payloads keep presence flags only|includePrivateNotes/);
  assert.match(eventsDetailRoute, /EventNotFoundError/);
  assert.match(eventsDetailRoute, /status:\s*404/);
  assert.match(eventsDetailRoute, /Relationship event not found\./);
  assert.doesNotMatch(
    eventsDetailRoute,
    /Event does not belong to the selected client/,
  );
  assert.match(contactsPatchRoute, /ContactNotFoundError/);
  assert.match(contactsPatchRoute, /status:\s*404/);
  assert.match(contactsPatchRoute, /Contact not found\./);
  assert.doesNotMatch(contactsPatchRoute, /does not belong to this client/);
  assert.match(fetchWorkspace, /^import "server-only"/m);
  assert.match(eventsData, /^import "server-only"/m);
  assert.match(contactsData, /^import "server-only"/m);
  assert.match(formOptions, /listOperatorContactOptionsForClient|listOperatorClientOptions/);
  assert.doesNotMatch(formOptions, /relationshipNotes|contextNotes|followUpNotes/);
  assert.match(listScreen, /hasPrivateContext|hasFollowUpNotes/);
  assert.doesNotMatch(listScreen, /event\.contextNotes|event\.followUpNotes/);
  console.log("  ✔ list over-serialization fixed; uniform 404; server-only guards");

  // --- No private values in routes / metadata patterns ---
  assert.doesNotMatch(panel, /contextNotes=|followUpNotes=|relationshipNotes=/);
  assert.doesNotMatch(listScreen, /contextNotes=|followUpNotes=/);
  assert.doesNotMatch(listPage, /generateMetadata/);
  assert.doesNotMatch(detailPage, /generateMetadata/);
  assert.match(opsLayout, /robots:\s*\{\s*index:\s*false/);
  assert.match(eventsData, /No activity emission/);
  assert.match(contactsData, /Does not emit activity|private fields must not enter/);
  console.log("  ✔ no private URL/metadata/activity emission patterns");

  // --- Portal / public denial ---
  const privateTokens = [
    "client-contacts",
    "client-relationship-events",
    "contextNotes",
    "followUpNotes",
    "relationshipNotes",
  ];
  for (const dir of [
    path.join(root, "app/(portal)"),
    path.join(root, "app/portal"),
    path.join(root, "lib/portal"),
  ]) {
    for (const file of walkFiles(dir, new Set([".ts", ".tsx"]))) {
      const src = readFileSync(file, "utf8");
      for (const token of privateTokens) {
        assert.doesNotMatch(
          src,
          new RegExp(token),
          `${path.relative(root, file)} must not reference ${token}`,
        );
      }
    }
  }
  console.log("  ✔ portal/public surfaces do not import Phase 3 private tokens");

  // --- Canonical routes + Timeline distinct ---
  assert.match(nav, /href:\s*"\/admin\/operations\/events"/);
  assert.match(nav, /href:\s*"\/admin\/operations\/timeline"/);
  assert.match(editions, /events:\s*"portfolio"/);
  assert.match(editions, /timeline:\s*"timeline"/);
  assert.match(portfolio, /\/admin\/operations\/events/);
  assert.match(portfolio, /tab=relationship/);
  assert.match(panel, /events\/new\?clientId=/);
  console.log("  ✔ Portfolio ↔ Relationship ↔ Events routes; Timeline distinct");

  // --- Separation ---
  assert.doesNotMatch(eventsData, /executive-timeline-events|client-timeline-events/);
  assert.doesNotMatch(eventsData, /google\/calendar|work_schedule_links/);
  assert.doesNotMatch(eventsData, /recordActivity|emitActivity|activity\.create/);
  for (const dir of ["lib/google/calendar", "lib/scheduling"]) {
    for (const file of walkFiles(path.join(root, dir), new Set([".ts", ".tsx"]))) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(src, /client-relationship-events|client-contacts/);
    }
  }
  console.log("  ✔ Calendar / Timeline / scheduling / activity remain separate");

  // --- Batch A–D artifacts ---
  assert.equal(existsSync(path.join(root, "app/admin/operations/events/page.tsx")), true);
  assert.match(panel, /Read-only/);
  assert.doesNotMatch(panel, /\/api\/admin\/client-relationship\/events/);
  assert.match(
    migrationsIndex,
    /20260727_phase3_client_relationship_intelligence/,
  );
  const phase3Migrations = readdirSync(path.join(root, "migrations")).filter(
    (f) =>
      f.endsWith(".ts") &&
      f !== "index.ts" &&
      /phase3_client_relationship/.test(f),
  );
  assert.deepEqual(phase3Migrations, [
    "20260727_phase3_client_relationship_intelligence.ts",
  ]);
  assert.match(phaseDoc, /Batch E[^\n]*Implemented|Batch E — Verification/);
  assert.match(phaseDoc, /awaiting review\/publication|Implemented \(awaiting/);
  console.log("  ✔ Batches A–D intact; single Phase 3 migration; Batch E documented");

  // Existing batch verifiers present
  for (const script of [
    "scripts/verify-phase3-relationship-foundation.ts",
    "scripts/verify-phase3-client-intelligence.ts",
    "scripts/verify-phase3-relationship-events.ts",
    "scripts/verify-phase3-relationship-connections.ts",
  ]) {
    assert.equal(existsSync(path.join(root, script)), true);
  }
  console.log("  ✔ focused A–D verifiers remain present");

  console.log("\nPhase 3 Batch E completion verification passed.\n");
}

main();
