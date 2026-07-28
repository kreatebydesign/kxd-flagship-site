/**
 * Phase 3 Batch D — Relationship connections, navigation, and permission wiring.
 * Static source assertions only — no database mutations.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

function main() {
  console.log("\nPhase 3 Batch D — Relationship connections verification\n");

  const nav = read("components/admin/operations/shared/operations-nav.ts");
  const editions = read("lib/editions/navigation.ts");
  const shell = read("components/admin/operations/shared/OperationsShell.tsx");
  const permissions = read("lib/staff/permissions.ts");
  const portfolio = read(
    "components/admin/operations/client-portfolio/ClientPortfolioScreen.tsx",
  );
  const panel = read(
    "components/admin/operations/client-workspace/RelationshipIntelligencePanel.tsx",
  );
  const listScreen = read(
    "components/admin/operations/events/EventsListScreen.tsx",
  );
  const detailScreen = read(
    "components/admin/operations/events/EventDetailScreen.tsx",
  );
  const newPage = read("app/admin/operations/events/new/page.tsx");
  const listPage = read("app/admin/operations/events/page.tsx");
  const detailPage = read("app/admin/operations/events/[id]/page.tsx");
  const eventsData = read("lib/executive-client-workspace/events-data.ts");
  const phaseDoc = read("docs/PHASE-3-CLIENT-RELATIONSHIP-INTELLIGENCE.md");
  const contactsCollection = read("payload/collections/ClientContacts.ts");
  const eventsCollection = read("payload/collections/ClientRelationshipEvents.ts");
  const migrationsIndex = read("migrations/index.ts");

  // 1–2. Canonical routes + Timeline distinct
  assert.match(nav, /id:\s*"events"/);
  assert.match(nav, /href:\s*"\/admin\/operations\/events"/);
  assert.match(nav, /id:\s*"timeline"/);
  assert.match(nav, /href:\s*"\/admin\/operations\/timeline"/);
  assert.notEqual(
    nav.match(/href:\s*"\/admin\/operations\/events"/)?.index,
    nav.match(/href:\s*"\/admin\/operations\/timeline"/)?.index,
  );
  assert.match(editions, /events:\s*"portfolio"/);
  assert.match(editions, /timeline:\s*"timeline"/);
  console.log("  ✔ Events and Timeline remain distinct in nav + edition map");

  // 3–5. Bidirectional connections without private URL payloads
  assert.match(portfolio, /\/admin\/operations\/events/);
  assert.match(portfolio, /tab=relationship/);
  assert.match(panel, /events\/new\?clientId=\$\{clientId\}/);
  assert.match(listScreen, /\/admin\/operations\/clients/);
  assert.match(listScreen, /clientRelationshipHref|clientHref/);
  assert.match(detailScreen, /clientRelationshipHref/);
  assert.match(detailScreen, /Client portfolio/);
  assert.match(detailScreen, /Manage contacts on client relationship/);
  assert.doesNotMatch(panel, /contextNotes=|followUpNotes=|relationshipNotes=/);
  assert.doesNotMatch(listScreen, /contextNotes=|followUpNotes=/);
  assert.doesNotMatch(detailScreen, /contextNotes=|followUpNotes=/);
  console.log("  ✔ Bidirectional Portfolio ↔ Relationship ↔ Events links");

  // 6. Client preselect is optional query only; server still authoritative
  assert.match(newPage, /searchParams/);
  assert.match(newPage, /initialClientId/);
  assert.match(newPage, /never trusted|validates ownership server-side/i);
  assert.match(detailScreen, /initialClientId/);
  assert.match(eventsData, /delete data\.client/);
  assert.match(eventsData, /assertContactsBelongToClient/);
  console.log("  ✔ clientId query preselects only; ownership remains server-side");

  // 7–14. Authorization + staff denial
  assert.match(listPage, /requirePayloadAdminPage/);
  assert.match(newPage, /requirePayloadAdminPage/);
  assert.match(detailPage, /requirePayloadAdminPage/);
  for (const rel of [
    "app/api/admin/client-relationship/events/route.ts",
    "app/api/admin/client-relationship/events/[id]/route.ts",
    "app/api/admin/client-relationship/form-options/route.ts",
    "app/api/admin/client-relationship/contacts/route.ts",
  ]) {
    assert.match(read(rel), /requirePayloadAdminApi/);
  }

  assert.match(permissions, /Phase 3 relationship surfaces stay off this allowlist/);
  assert.match(permissions, /client-relationship\/\*\*/);
  assert.doesNotMatch(
    permissions,
    /STAFF_ALLOWED_PAGE_PREFIXES[\s\S]*?\/admin\/operations\/events/,
  );
  assert.doesNotMatch(
    permissions,
    /STAFF_ALLOWED_API_PREFIXES[\s\S]*?client-relationship/,
  );
  assert.doesNotMatch(shell, /STAFF_NAV_GROUPS[\s\S]*?\/admin\/operations\/events/);
  assert.match(shell, /Relationship Events[\s\S]*?stay out|Portfolio[\s\S]*?stay out/i);

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
  console.log("  ✔ Direct routes + APIs remain studio-operator; restricted staff denied");

  // Permission-aware empty / denied states
  assert.match(listScreen, /Access denied|do not have permission/);
  assert.match(listScreen, /setDenied|denied/);
  assert.match(detailScreen, /do not have permission/);
  console.log("  ✔ Permission-aware empty/denied states present");

  // 16–20. Schema + Batch B/C intact; no Calendar/Timeline crossover
  assert.match(contactsCollection, /slug:\s*"client-contacts"/);
  assert.match(eventsCollection, /slug:\s*"client-relationship-events"/);
  assert.match(migrationsIndex, /20260727_phase3_client_relationship_intelligence/);
  assert.match(panel, /Read-only/);
  assert.doesNotMatch(panel, /\/api\/admin\/client-relationship\/events/);
  assert.equal(existsSync(path.join(root, "app/admin/operations/events/page.tsx")), true);
  assert.doesNotMatch(eventsData, /executive-timeline-events|client-timeline-events/);
  assert.doesNotMatch(eventsData, /google\/calendar|work_schedule_links/);
  assert.doesNotMatch(eventsData, /recordActivity|emitActivity|activity\.create/);
  console.log("  ✔ Batch B/C intact; Calendar/Timeline/activity stay separate");

  // No schema/migration drift in Batch D working tree expectations (source contract)
  assert.match(phaseDoc, /Batch D[^\n]*Implemented|Batch D — Relationship connections/);
  assert.doesNotMatch(phaseDoc, /Batch F[^\n]*✅ Implemented/);
  console.log("  ✔ Batch D documented; no later-phase Batch F");

  console.log("\nPhase 3 Batch D Relationship connections verification passed.\n");
}

main();
