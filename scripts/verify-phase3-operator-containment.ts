/**
 * Phase 3 operator containment — Founding Client Early Access.
 * Static contracts only. No database. No migrations. No external writes.
 *
 * Run: npm run verify:phase3-operator-containment
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  PHASE3_OPERATOR_UNAVAILABLE_MESSAGE,
  Phase3SchemaUnavailableError,
  isPhase3SchemaUnavailableError,
  phase3UnavailableResponseBody,
  toPhase3SchemaUnavailableError,
} from "../lib/executive-client-workspace/phase3-schema";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function main() {
  console.log("\nPhase 3 operator containment verification\n");

  // --- Pure unavailable classification ---
  check(
    "missing relation client_contacts is classified unavailable",
    isPhase3SchemaUnavailableError(
      new Error('relation "public.client_contacts" does not exist'),
    ),
  );
  check(
    "missing relation client_relationship_events is classified unavailable",
    isPhase3SchemaUnavailableError(
      Object.assign(new Error("relation client_relationship_events does not exist"), {
        code: "42P01",
      }),
    ),
  );
  check(
    "unrelated failure is not classified unavailable",
    !isPhase3SchemaUnavailableError(new Error("permission denied for table clients")),
  );
  check(
    "auth-like error mentioning contacts without missing-table is not unavailable",
    !isPhase3SchemaUnavailableError(
      new Error("Unauthorized access to client-contacts collection"),
    ),
  );
  check(
    "Phase3SchemaUnavailableError maps to itself",
    toPhase3SchemaUnavailableError(new Phase3SchemaUnavailableError()) instanceof
      Phase3SchemaUnavailableError,
  );
  const body = phase3UnavailableResponseBody({ events: [] });
  check(
    "unavailable response body is honest and non-success",
    body.success === false &&
      body.unavailable === true &&
      body.error === PHASE3_OPERATOR_UNAVAILABLE_MESSAGE &&
      !String(body.error).includes("client_contacts") &&
      !String(body.error).includes("SQL"),
  );

  // --- Data layer wraps ---
  const eventsData = read("lib/executive-client-workspace/events-data.ts");
  const contactsData = read("lib/executive-client-workspace/contacts-data.ts");
  const schema = read("lib/executive-client-workspace/phase3-schema.ts");
  const http = read("lib/executive-client-workspace/phase3-http.ts");
  const workspace = read("lib/executive-client-workspace/fetch-client-workspace.ts");

  check(
    "events-data uses withPhase3Schema for list/create/update",
    eventsData.includes("withPhase3Schema") &&
      eventsData.includes("Phase3SchemaUnavailableError") &&
      eventsData.includes("listRelationshipEvents") &&
      eventsData.includes("createRelationshipEvent"),
  );
  check(
    "contacts-data uses withPhase3Schema for create/update",
    contactsData.includes("withPhase3Schema") &&
      contactsData.includes("createClientContactForClient") &&
      contactsData.includes("updateClientContactForClient"),
  );
  check(
    "workspace loader sets phase3RelationshipUnavailable from schema errors",
    workspace.includes("phase3RelationshipUnavailable") &&
      workspace.includes("isPhase3SchemaUnavailableError"),
  );

  // --- API routes ---
  const routes = [
    "app/api/admin/client-relationship/events/route.ts",
    "app/api/admin/client-relationship/events/[id]/route.ts",
    "app/api/admin/client-relationship/contacts/route.ts",
    "app/api/admin/client-relationship/contacts/[id]/route.ts",
    "app/api/admin/client-relationship/form-options/route.ts",
  ];
  for (const rel of routes) {
    const src = read(rel);
    check(
      `${rel} requires admin auth`,
      src.includes("requirePayloadAdminApi"),
    );
    check(
      `${rel} maps Phase3SchemaUnavailableError to 503 helper`,
      src.includes("Phase3SchemaUnavailableError") &&
        src.includes("phase3UnavailableHttpResponse"),
    );
    check(
      `${rel} does not return success on unavailable`,
      !src.includes("success: true, unavailable"),
    );
  }
  check(
    "phase3-http returns status 503",
    http.includes("status: 503") && http.includes("phase3UnavailableResponseBody"),
  );

  // --- Operator UI ---
  const eventsList = read(
    "components/admin/operations/events/EventsListScreen.tsx",
  );
  const panel = read(
    "components/admin/operations/client-workspace/RelationshipIntelligencePanel.tsx",
  );
  check(
    "Events list handles unavailable without treating as generic crash",
    eventsList.includes("unavailable") &&
      eventsList.includes("PHASE3_OPERATOR_UNAVAILABLE_MESSAGE") &&
      eventsList.includes("503"),
  );
  check(
    "Relationship panel guards writes when schemaUnavailable",
    panel.includes("schemaUnavailable") &&
      panel.includes("PHASE3_OPERATOR_UNAVAILABLE_MESSAGE") &&
      panel.includes("temporarily unavailable"),
  );

  // --- Portal isolation ---
  const portalApp = read("app/(portal)/portal/(app)/layout.tsx");
  check(
    "portal app layout does not import Phase 3 relationship APIs",
    !portalApp.includes("client-relationship") &&
      !portalApp.includes("events-data") &&
      !portalApp.includes("contacts-data"),
  );
  check(
    "schema helper does not expose portal session hooks",
    !schema.includes("getPortalSession") && !schema.includes("portal-users"),
  );

  // --- Single-client fallback intact ---
  const memberships = read("lib/portal/memberships.ts");
  check(
    "portal memberships legacy fallback remains",
    memberships.includes("legacy-fallback") || memberships.includes("legacy"),
  );
  check(
    "memberships still catch missing membership table without throwing",
    memberships.includes("Table missing") || memberships.includes("return []"),
  );

  // --- Migrations untouched contract ---
  const mig = read("migrations/20260727_phase3_client_relationship_intelligence.ts");
  const index = read("migrations/index.ts");
  check(
    "Phase 3 migration file still present and additive",
    mig.includes("client_contacts") && mig.includes("client_relationship_events"),
  );
  check(
    "Phase 3 + Phase 4 remain registered in migrations/index.ts",
    index.includes("20260727_phase3_client_relationship_intelligence") &&
      index.includes("20260728_phase4_portal_client_memberships"),
  );

  // --- Experience feedback auth contract alignment ---
  const feedbackVerify = read("scripts/verify-experience-feedback.ts");
  check(
    "experience-feedback verifier asserts /admin/ prefix auth",
    feedbackVerify.includes('pathname.startsWith("/admin/")') &&
      feedbackVerify.includes("requiresPayloadAdminAuth") &&
      feedbackVerify.includes("/admin/work/:path*") &&
      feedbackVerify.includes("admin work/sales/training matcher"),
  );

  console.log("\nPhase 3 operator containment verification passed.\n");
}

main();
