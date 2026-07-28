/**
 * Phase 3 Batch A — Client & Relationship Intelligence privacy foundation checks.
 * Static verification only — no DB writes, no production mutation.
 *
 * Run: npm run verify:phase3-relationship-foundation
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  isAuthenticated,
  isPayloadAdmin,
  isRestrictedStaffPayloadUser,
  isStudioPayloadOperator,
  studioOperatorFieldAccess,
} from "../payload/access/index.ts";

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
    if (ent.name === "node_modules" || ent.name === ".next" || ent.name === ".git" || ent.name === ".tmp") {
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
  console.log("\nPhase 3 Batch A — relationship foundation verification\n");

  const contactsSrc = read("payload/collections/ClientContacts.ts");
  const eventsSrc = read("payload/collections/ClientRelationshipEvents.ts");
  const payloadConfig = read("payload.config.ts");
  const migrationsIndex = read("migrations/index.ts");
  const migrationFile = read(
    "migrations/20260727_phase3_client_relationship_intelligence.ts",
  );
  const accessSrc = read("payload/access/index.ts");
  const clientsSrc = read("payload/collections/Clients.ts");
  const profilesSrc = read("payload/collections/ExecutiveClientProfiles.ts");
  const clientTimelineSrc = read("payload/collections/ClientTimelineEvents.ts");
  const execTimelineSrc = read("payload/collections/ExecutiveTimelineEvents.ts");

  assert.match(contactsSrc, /slug:\s*"client-contacts"/);
  assert.match(eventsSrc, /slug:\s*"client-relationship-events"/);
  console.log("  ✔ collection slugs registered in collection files");

  assert.match(
    contactsSrc,
    /name:\s*"client"[\s\S]*?relationTo:\s*"clients"[\s\S]*?required:\s*true/,
  );
  assert.match(
    eventsSrc,
    /name:\s*"client"[\s\S]*?relationTo:\s*"clients"[\s\S]*?required:\s*true/,
  );
  console.log("  ✔ both collections require a Client relationship");

  assert.match(eventsSrc, /relationTo:\s*"client-contacts"/);
  assert.match(eventsSrc, /hasMany:\s*true/);
  assert.match(migrationFile, /client_relationship_events_rels/);
  assert.match(migrationFile, /client_contacts_id/);
  console.log("  ✔ relationship events can reference contacts (hasMany + rels table)");

  for (const [label, src] of [
    ["client-contacts", contactsSrc],
    ["client-relationship-events", eventsSrc],
  ] as const) {
    assert.match(src, /read:\s*isAuthenticated/);
    assert.match(src, /create:\s*isAuthenticated/);
    assert.match(src, /update:\s*isAuthenticated/);
    assert.match(src, /delete:\s*isAuthenticated/);
    assert.doesNotMatch(src, /publicRead|publicCreate/);
    console.log(`  ✔ ${label} collection access is studio-operator-only (isAuthenticated)`);
  }

  for (const field of [
    "preferredCommunication",
    "relationshipNotes",
    "preferences",
    "dietaryNotes",
    "accessibilityNotes",
  ]) {
    assert.match(contactsSrc, new RegExp(`name:\\s*"${field}"`));
    assert.match(
      contactsSrc,
      new RegExp(
        `name:\\s*"${field}"[\\s\\S]*?access:\\s*\\{[\\s\\S]*?studioOperatorFieldAccess`,
      ),
    );
  }
  for (const field of [
    "contextNotes",
    "followUpNotes",
    "dietaryNotes",
    "accessibilityNotes",
  ]) {
    assert.match(eventsSrc, new RegExp(`name:\\s*"${field}"`));
    assert.match(
      eventsSrc,
      new RegExp(
        `name:\\s*"${field}"[\\s\\S]*?access:\\s*\\{[\\s\\S]*?studioOperatorFieldAccess`,
      ),
    );
  }
  assert.match(accessSrc, /export const studioOperatorFieldAccess/);
  console.log("  ✔ sensitive private fields use studioOperatorFieldAccess");

  const noUser = null;
  const portalUser = { collection: "portal-users", id: 1 } as never;
  const restrictedStaff = {
    collection: "users",
    id: 2,
    role: "editor",
    staffRole: "operations_coordinator",
  } as never;
  const studioOperator = {
    collection: "users",
    id: 3,
    role: "admin",
  } as never;

  assert.equal(isPayloadAdmin(noUser), false);
  assert.equal(isStudioPayloadOperator(noUser), false);
  assert.equal(isAuthenticated({ req: { user: noUser } } as never), false);
  assert.equal(studioOperatorFieldAccess({ req: { user: noUser } } as never), false);

  assert.equal(isPayloadAdmin(portalUser), false);
  assert.equal(isStudioPayloadOperator(portalUser), false);
  assert.equal(isAuthenticated({ req: { user: portalUser } } as never), false);
  assert.equal(studioOperatorFieldAccess({ req: { user: portalUser } } as never), false);

  assert.equal(isRestrictedStaffPayloadUser(restrictedStaff), true);
  assert.equal(isStudioPayloadOperator(restrictedStaff), false);
  assert.equal(isAuthenticated({ req: { user: restrictedStaff } } as never), false);
  assert.equal(
    studioOperatorFieldAccess({ req: { user: restrictedStaff } } as never),
    false,
  );

  assert.equal(isStudioPayloadOperator(studioOperator), true);
  assert.equal(isAuthenticated({ req: { user: studioOperator } } as never), true);
  assert.equal(
    studioOperatorFieldAccess({ req: { user: studioOperator } } as never),
    true,
  );
  console.log("  ✔ access helpers deny unauthenticated, portal, and restricted staff");

  assert.match(payloadConfig, /ClientContacts/);
  assert.match(payloadConfig, /ClientRelationshipEvents/);
  assert.match(payloadConfig, /from "\.\/payload\/collections\/ClientContacts\.ts"/);
  assert.match(
    payloadConfig,
    /from "\.\/payload\/collections\/ClientRelationshipEvents\.ts"/,
  );
  console.log("  ✔ payload.config.ts registers both collections");

  assert.match(
    migrationsIndex,
    /20260727_phase3_client_relationship_intelligence/,
  );
  assert.match(migrationFile, /CREATE TABLE IF NOT EXISTS "client_contacts"/);
  assert.match(
    migrationFile,
    /CREATE TABLE IF NOT EXISTS "client_relationship_events"/,
  );
  assert.match(migrationFile, /No data backfill/);
  assert.doesNotMatch(migrationFile, /UPDATE\s+"clients"/i);
  assert.doesNotMatch(migrationFile, /DROP TABLE IF EXISTS "clients"/);
  assert.doesNotMatch(migrationFile, /executive_client_profiles_secondary_contacts/);
  console.log("  ✔ migration registered and additive (no Clients/timeline mutation)");

  assert.match(clientsSrc, /primaryContactName/);
  assert.match(clientsSrc, /primaryContactEmail/);
  assert.match(profilesSrc, /secondaryContacts/);
  assert.doesNotMatch(clientsSrc, /client-contacts/);
  assert.doesNotMatch(profilesSrc, /client-relationship-events/);
  console.log("  ✔ existing flat/embedded contact fields preserved");

  assert.match(clientTimelineSrc, /slug:\s*"client-timeline-events"/);
  assert.match(execTimelineSrc, /slug:\s*"executive-timeline-events"/);
  assert.doesNotMatch(clientTimelineSrc, /client-relationship-events/);
  assert.doesNotMatch(execTimelineSrc, /client-relationship-events/);
  console.log("  ✔ Timeline collections unchanged and distinct");

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
    "dietaryNotes",
    "accessibilityNotes",
    "relationshipNotes",
    "preferredCommunication",
    "contextNotes",
    "followUpNotes",
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
  console.log("  ✔ portal/public loaders do not import Phase 3 private collections/fields");

  const calendarScheduling = [
    "lib/google/calendar",
    "lib/scheduling",
  ];
  for (const dir of calendarScheduling) {
    for (const file of walkFiles(path.join(root, dir), leakExts)) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(src, /client-relationship-events|client-contacts/);
    }
  }
  console.log("  ✔ Google Calendar / scheduling systems do not reference Phase 3 collections");

  const publicAppFiles = walkFiles(path.join(root, "app"), leakExts).filter((f) => {
    const rel = path.relative(root, f);
    return (
      !rel.startsWith(`app${path.sep}admin`) &&
      !rel.startsWith(`app${path.sep}(payload)`) &&
      !rel.startsWith(`app${path.sep}api${path.sep}admin`)
    );
  });
  for (const file of publicAppFiles) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(
      src,
      /client-contacts|client-relationship-events|ClientContacts|ClientRelationshipEvents/,
    );
  }
  console.log("  ✔ non-admin app routes do not reference Phase 3 collections");

  console.log("\nPhase 3 Batch A foundation verification passed.\n");
}

main();
