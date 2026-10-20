/**
 * Release B Phase 1 — disposable Postgres + security gate (PR #81).
 *
 *   STAFF_DOC_RELEASE_B_GATE=1 KXD_SERVER_ONLY_SHIM=1 \
 *     node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/verify-staff-documents-release-b-gate.ts
 *
 * Requires STAFF_DOC_DISPOSABLE_DATABASE_URL (or DATABASE_URL) — never production main.
 */
import assert from "node:assert/strict";

const enabled = process.env.STAFF_DOC_RELEASE_B_GATE === "1";
if (!enabled) {
  console.log(
    "\nverify:staff-documents-release-b-gate — skipped (set STAFF_DOC_RELEASE_B_GATE=1)\n",
  );
  process.exit(0);
}

const runTag = `pr81-gate-${Date.now()}`;
const RELEASE_B_MIGRATION = "20261021_staff_documents_release_b_phase1";

const NONBINDING_AGREEMENT_BODY = `[NONBINDING TEST ONLY — ${runTag}]
This is synthetic test content for Release B validation. Not an enforceable agreement.`;

async function columnExists(
  db: { execute: (q: unknown) => Promise<unknown> },
  sqlTag: typeof import("@payloadcms/db-postgres").sql,
  table: string,
  column: string,
): Promise<boolean> {
  const { asRowList } = await import("../lib/connect/db.ts");
  const result = await db.execute(sqlTag`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    LIMIT 1
  `);
  return asRowList(result as { rows?: unknown[] }).length > 0;
}

async function ensureReleaseBMigration(
  db: NonNullable<ReturnType<typeof import("../lib/connect/db.ts").getConnectPostgresExecutor>>,
): Promise<void> {
  const { sql } = await import("@payloadcms/db-postgres");
  const { asRowList } = await import("../lib/connect/db.ts");

  if (!(await columnExists(db, sql, "staff_documents", "signing_mode"))) {
    const { up } = await import("../migrations/20261021_staff_documents_release_b_phase1.ts");
    await up({ db } as import("@payloadcms/db-postgres").MigrateUpArgs);
  }

  const existing = await db.execute(sql`
    SELECT name FROM payload_migrations WHERE name = ${RELEASE_B_MIGRATION} LIMIT 1
  `);
  if (asRowList<{ name: string }>(existing as { rows?: { name: string }[] }).length === 0) {
    const batchResult = await db.execute(sql`
      SELECT COALESCE(MAX(batch), 0) + 1 AS next FROM payload_migrations
    `);
    const batch = Number(
      asRowList<{ next: number }>(batchResult as { rows?: { next: number }[] })[0]?.next ?? 1,
    );
    await db.execute(sql`
      INSERT INTO payload_migrations (name, batch, updated_at, created_at)
      VALUES (${RELEASE_B_MIGRATION}, ${batch}, now(), now())
    `);
  }

  assert.equal(await columnExists(db, sql, "staff_documents", "employee_signature"), true);
  assert.equal(await columnExists(db, sql, "staff_documents", "executed_at"), true);

  const idx = await db.execute(sql`
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'staff_documents_status_signing_mode_idx'
    LIMIT 1
  `);
  assert.ok(asRowList(idx as { rows?: unknown[] }).length > 0, "status+signing_mode index");
}

function staffActor(user: {
  id: number;
  email: string;
  displayName?: string;
  role: "admin" | "editor";
  staffRole: string;
}): import("@/lib/staff/types").StaffActor {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName ?? user.email,
    role: user.role,
    staffRole: user.staffRole as import("@/lib/staff/types").StaffRoleId,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function main(): Promise<void> {
  const dbUrl =
    process.env.STAFF_DOC_DISPOSABLE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URI?.trim();
  if (!dbUrl) {
    throw new Error("STAFF_DOC_DISPOSABLE_DATABASE_URL or DATABASE_URL required.");
  }
  process.env.DATABASE_URL = dbUrl;
  process.env.DATABASE_URI = dbUrl;

  const host = new URL(dbUrl).hostname;
  console.log(`\nverify:staff-documents-release-b-gate`);
  console.log(`  host=${host}`);
  console.log(`  runTag=${runTag}\n`);

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const { sql } = await import("@payloadcms/db-postgres");
  const { getConnectPostgresExecutor, asRowList } = await import("../lib/connect/db.ts");
  const { SAMPLE_NONBINDING_POLICY_BODY, SAMPLE_NONBINDING_POLICY_TITLE } = await import(
    "../lib/staff-documents/constants.ts"
  );
  const {
    createStaffDocumentTemplate,
    updateStaffDocumentTemplateStatus,
    assignStaffDocumentFromTemplate,
    getStaffDocumentDetail,
    acknowledgeStaffDocument,
  } = await import("../lib/staff-documents/data.ts");
  const {
    defaultSigningModeForKind,
    resolveSigningModeForTemplate,
  } = await import("../lib/staff-documents/validate.ts");
  const { staffMayCountersignDocuments } = await import("../lib/staff-documents/access.ts");
  const { buildStaffSignatureEvidence } = await import("../lib/staff-documents/signature.ts");
  const { hashStaffDocumentBody } = await import("../lib/staff-documents/hash.ts");
  const { claimStaffDocumentEmployeeSignature } = await import(
    "../lib/staff-documents/employee-sign-claim.ts"
  );
  const { claimStaffDocumentOperatorCountersignature } = await import(
    "../lib/staff-documents/operator-countersign-claim.ts"
  );
  const { claimStaffDocumentDecline, claimStaffDocumentRevoke } = await import(
    "../lib/staff-documents/decline-revoke-claim.ts"
  );
  const { finalizeStaffDocumentExecution } = await import(
    "../lib/staff-documents/execution-finalize.ts"
  );

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  assert.ok(db);

  await ensureReleaseBMigration(db);

  const contractsBefore = await db.execute(sql`SELECT COUNT(*)::int AS c FROM contracts`);
  const contractsBeforeN = Number(
    asRowList<{ c: number }>(contractsBefore as { rows?: { c: number }[] })[0]?.c ?? 0,
  );

  const adminUser = (await payload.create({
    collection: "users",
    data: {
      email: `${runTag}-admin@kxd-validation.invalid`,
      password: "ValidationPass123!",
      displayName: "Gate Admin",
      role: "admin",
      staffRole: "none",
    } as never,
    overrideAccess: true,
  })) as { id: number; email: string };

  const staffA = (await payload.create({
    collection: "users",
    data: {
      email: `${runTag}-a@kxd-validation.invalid`,
      password: "ValidationPass123!",
      displayName: "Gate Staff A",
      role: "editor",
      staffRole: "operations_coordinator",
      staffOnboardingCompletedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  })) as { id: number; email: string };

  const staffB = (await payload.create({
    collection: "users",
    data: {
      email: `${runTag}-b@kxd-validation.invalid`,
      password: "ValidationPass123!",
      displayName: "Gate Staff B",
      role: "editor",
      staffRole: "operations_coordinator",
      staffOnboardingCompletedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  })) as { id: number; email: string };

  const adminActor = staffActor({
    id: Number(adminUser.id),
    email: adminUser.email,
    role: "admin",
    staffRole: "none",
  });
  const actorA = staffActor({
    id: Number(staffA.id),
    email: staffA.email,
    role: "editor",
    staffRole: "operations_coordinator",
  });
  const actorB = staffActor({
    id: Number(staffB.id),
    email: staffB.email,
    role: "editor",
    staffRole: "operations_coordinator",
  });

  assert.equal(staffMayCountersignDocuments(adminActor), true);
  assert.equal(staffMayCountersignDocuments(actorA), false);

  console.log("  ✓ countersign capability: founder/admin only");

  assert.equal(defaultSigningModeForKind("employment-agreement"), "dual-signature");
  assert.equal(defaultSigningModeForKind("staff-policy"), "acknowledgment");

  const kinds: Array<{
    kind: import("../lib/staff-documents/types.ts").StaffDocumentKind;
    signingMode: import("../lib/staff-documents/types.ts").StaffDocumentSigningMode;
  }> = [
    { kind: "employment-agreement", signingMode: "dual-signature" },
    { kind: "confidentiality-nda", signingMode: "dual-signature" },
    { kind: "ip-assignment", signingMode: "dual-signature" },
  ];

  const templateIds: number[] = [];
  const documentIds: number[] = [];

  for (const spec of kinds) {
    const mode = resolveSigningModeForTemplate({ kind: spec.kind, signingMode: null });
    assert.equal(mode, spec.signingMode);

    const { id: templateId } = await createStaffDocumentTemplate({
      actor: adminActor,
      title: `[TEST ${spec.kind}] ${runTag}`,
      body: NONBINDING_AGREEMENT_BODY,
      kind: spec.kind,
    });
    templateIds.push(templateId);

    const tpl = await payload.findByID({
      collection: "staff-document-templates" as never,
      id: templateId,
      depth: 0,
      overrideAccess: true,
    });
    assert.equal(String((tpl as { signingMode?: string }).signingMode), spec.signingMode);
    assert.equal(String((tpl as { kind?: string }).kind), spec.kind);

    await updateStaffDocumentTemplateStatus({
      actor: adminActor,
      templateId,
      status: "approved-for-use",
    });

    const { documentId } = await assignStaffDocumentFromTemplate({
      actor: adminActor,
      templateId,
      staffUserId: Number(staffA.id),
    });
    documentIds.push(documentId);

    const doc = await payload.findByID({
      collection: "staff-documents" as never,
      id: documentId,
      depth: 0,
      overrideAccess: true,
    });
    assert.equal(String((doc as { status?: string }).status), "assigned");
    assert.equal(String((doc as { signingMode?: string }).signingMode), spec.signingMode);
  }

  console.log("  ✓ Payload kinds + signingMode defaults (employment, NDA, IP)");

  const { id: policyTplId } = await createStaffDocumentTemplate({
    actor: adminActor,
    title: `${SAMPLE_NONBINDING_POLICY_TITLE} (${runTag})`,
    body: SAMPLE_NONBINDING_POLICY_BODY,
    kind: "policy-acknowledgment",
  });
  templateIds.push(policyTplId);
  await updateStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId: policyTplId,
    status: "approved-for-use",
  });
  const { documentId: policyDocId } = await assignStaffDocumentFromTemplate({
    actor: adminActor,
    templateId: policyTplId,
    staffUserId: Number(staffA.id),
  });
  documentIds.push(policyDocId);

  const policyDetail = await getStaffDocumentDetail({ actor: actorA, documentId: policyDocId });
  assert.ok(policyDetail);
  assert.equal(policyDetail.signingMode, "acknowledgment");

  const { detail: acked, alreadyAcknowledged } = await acknowledgeStaffDocument({
    actor: actorA,
    documentId: policyDocId,
    legalName: "Gate Staff A",
    typedAcknowledgment: "Gate Staff A",
    electronicRecordsConsent: true,
    reviewedConfirmed: true,
  });
  assert.equal(alreadyAcknowledged, false);
  assert.equal(acked.status, "acknowledged");
  console.log("  ✓ Release A acknowledgment path on migrated schema");

  const dualDocId = documentIds[0];
  let crossDenied = false;
  try {
    await getStaffDocumentDetail({ actor: actorB, documentId: dualDocId });
  } catch {
    crossDenied = true;
  }
  assert.equal(crossDenied, true);
  console.log("  ✓ cross-employee document access denied");

  await assert.rejects(() =>
    payload.create({
      collection: "staff-documents" as never,
      data: {
        staffUser: staffA.id,
        templateVersion: 1,
        templateContentHash: "x",
        title: "blocked",
        kind: "employment-agreement",
        signingMode: "dual-signature",
        status: "assigned",
        legalEntityName: "Test",
        bodySnapshot: "x",
      } as never,
      overrideAccess: false,
    }),
  );
  await assert.rejects(() =>
    payload.update({
      collection: "staff-documents" as never,
      id: dualDocId,
      data: { title: "hijack" } as never,
      overrideAccess: false,
    }),
  );
  console.log("  ✓ Payload CRUD denied without overrideAccess");

  await assert.rejects(() =>
    payload.update({
      collection: "staff-documents" as never,
      id: policyDocId,
      data: { bodySnapshot: "mutated" } as never,
      overrideAccess: true,
    }),
  );
  console.log("  ✓ immutable snapshot blocked on privileged update hook");

  const dualRow = await payload.findByID({
    collection: "staff-documents" as never,
    id: dualDocId,
    depth: 0,
    overrideAccess: true,
  });
  const dualHash = String((dualRow as { templateContentHash?: string }).templateContentHash ?? "");
  const dualBody = String((dualRow as { bodySnapshot?: string }).bodySnapshot ?? "");
  const employeeSig = buildStaffSignatureEvidence({
    legalName: "Gate Staff A",
    title: "Staff",
    entityName: "Gate Staff A",
    email: staffA.email,
    typedAcknowledgment: "Gate Staff A",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actorRole: "staff-employee",
    documentContentHash: dualHash,
  });

  const wrongUserClaim = await claimStaffDocumentEmployeeSignature({
    payload,
    documentId: dualDocId,
    staffUserId: Number(staffB.id),
    employeeSignature: employeeSig,
    auditEvents: [{ id: "w1", at: new Date().toISOString(), action: "forged" }],
  });
  assert.equal(wrongUserClaim.kind, "not_found");
  console.log("  ✓ employee sign cannot forge another staff user id");

  const expiredDoc = (await payload.create({
    collection: "staff-documents" as never,
    data: {
      staffUser: staffA.id,
      templateVersion: 1,
      templateContentHash: dualHash,
      title: "[TEST] expired",
      kind: "employment-agreement",
      signingMode: "dual-signature",
      status: "assigned",
      legalEntityName: "Kreate by Design LLC",
      bodySnapshot: dualBody,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    } as never,
    overrideAccess: true,
  })) as { id: number };
  documentIds.push(Number(expiredDoc.id));

  const expiredClaim = await claimStaffDocumentEmployeeSignature({
    payload,
    documentId: Number(expiredDoc.id),
    staffUserId: Number(staffA.id),
    employeeSignature: employeeSig,
    auditEvents: [{ id: "e1", at: new Date().toISOString(), action: "sign" }],
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  });
  assert.equal(expiredClaim.kind, "expired");
  console.log("  ✓ expired document cannot be signed");

  const signAudit = [{ id: "s1", at: new Date().toISOString(), action: "staff.signed" }];
  const signResults = await Promise.all(
    Array.from({ length: 8 }, () =>
      claimStaffDocumentEmployeeSignature({
        payload,
        documentId: dualDocId,
        staffUserId: Number(staffA.id),
        employeeSignature: employeeSig,
        auditEvents: signAudit,
      }),
    ),
  );
  assert.equal(signResults.filter((r) => r.kind === "claimed").length, 1);
  assert.equal(signResults.filter((r) => r.kind === "already_signed").length, 7);

  const declineDoc = (await payload.create({
    collection: "staff-documents" as never,
    data: {
      staffUser: staffA.id,
      templateVersion: 1,
      templateContentHash: dualHash,
      title: "[TEST] decline race",
      kind: "employment-agreement",
      signingMode: "dual-signature",
      status: "assigned",
      legalEntityName: "Kreate by Design LLC",
      bodySnapshot: dualBody,
    } as never,
    overrideAccess: true,
  })) as { id: number };
  documentIds.push(Number(declineDoc.id));

  const declineRace = await Promise.all([
    claimStaffDocumentDecline({
      payload,
      documentId: Number(declineDoc.id),
      staffUserId: Number(staffA.id),
      declinedAt: new Date().toISOString(),
      auditEvents: [{ id: "d1", at: new Date().toISOString(), action: "decline" }],
    }),
    claimStaffDocumentEmployeeSignature({
      payload,
      documentId: Number(declineDoc.id),
      staffUserId: Number(staffA.id),
      employeeSignature: employeeSig,
      auditEvents: signAudit,
    }),
    claimStaffDocumentEmployeeSignature({
      payload,
      documentId: Number(declineDoc.id),
      staffUserId: Number(staffA.id),
      employeeSignature: employeeSig,
      auditEvents: signAudit,
    }),
  ]);
  const terminal = declineRace.map((r) => r.kind);
  const winners = terminal.filter((k) => k === "declined" || k === "claimed");
  assert.equal(winners.length, 1, `decline vs sign: expected 1 winner, got ${terminal.join(",")}`);
  const losersOk = terminal.every(
    (k) =>
      k === "declined" ||
      k === "claimed" ||
      k === "already_signed" ||
      k === "not_claimable",
  );
  assert.equal(losersOk, true);
  console.log("  ✓ decline vs sign race: single winner");

  const operatorSig = buildStaffSignatureEvidence({
    legalName: "Gate Admin",
    title: "Admin",
    entityName: "Kreate by Design LLC",
    email: adminUser.email,
    typedAcknowledgment: "Gate Admin",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actorRole: "kxd-employer-representative",
    documentContentHash: dualHash,
    priorSignatureHash: employeeSig.signatureHash,
  });

  const opResults = await Promise.all(
    Array.from({ length: 6 }, () =>
      claimStaffDocumentOperatorCountersignature({
        payload,
        documentId: dualDocId,
        operatorSignature: operatorSig,
        auditEvents: [{ id: "o1", at: new Date().toISOString(), action: "operator.signed" }],
      }),
    ),
  );
  assert.equal(opResults.filter((r) => r.kind === "claimed").length, 1);
  assert.equal(opResults.filter((r) => r.kind === "already_executing").length, 5);

  const revokeRaceDoc = (await payload.create({
    collection: "staff-documents" as never,
    data: {
      staffUser: staffA.id,
      templateVersion: 1,
      templateContentHash: dualHash,
      title: "[TEST] revoke race",
      kind: "employment-agreement",
      signingMode: "dual-signature",
      status: "awaiting-operator-signature",
      legalEntityName: "Kreate by Design LLC",
      bodySnapshot: dualBody,
      employeeSignature: employeeSig,
    } as never,
    overrideAccess: true,
  })) as { id: number };
  documentIds.push(Number(revokeRaceDoc.id));

  const revokeRace = await Promise.all([
    claimStaffDocumentRevoke({
      payload,
      documentId: Number(revokeRaceDoc.id),
      auditEvents: [{ id: "r1", at: new Date().toISOString(), action: "revoke" }],
    }),
    claimStaffDocumentOperatorCountersignature({
      payload,
      documentId: Number(revokeRaceDoc.id),
      operatorSignature: operatorSig,
      auditEvents: [{ id: "o2", at: new Date().toISOString(), action: "operator.signed" }],
    }),
  ]);
  assert.ok(
    revokeRace.some((r) => r.kind === "revoked" || r.kind === "claimed"),
    "revoke vs countersign must produce a winner",
  );
  console.log("  ✓ operator countersign concurrency + revoke vs countersign race");

  const pdfFail = await finalizeStaffDocumentExecution({
    payload,
    documentId: dualDocId,
    auditEvents: [{ id: "f1", at: new Date().toISOString(), action: "finalize" }],
    generateExecutedPdf: async () => Buffer.from("%PDF-fake"),
    storeExecutedPdf: async () => {
      throw new Error("simulated storage failure");
    },
  });
  assert.equal(pdfFail.ok, false);
  assert.equal(pdfFail.ok === false ? pdfFail.stage : null, "pdf");

  const rowAfterFail = await payload.findByID({
    collection: "staff-documents" as never,
    id: dualDocId,
    depth: 0,
    overrideAccess: true,
  });
  assert.equal(String((rowAfterFail as { status?: string }).status), "executing");
  console.log("  ✓ PDF storage failure leaves document executing (not executed)");

  const finOk = await finalizeStaffDocumentExecution({
    payload,
    documentId: dualDocId,
    auditEvents: [{ id: "f2", at: new Date().toISOString(), action: "finalize" }],
    generateExecutedPdf: async () => Buffer.from("%PDF-fake"),
    storeExecutedPdf: async () => 999,
  });
  assert.equal(finOk.ok, true);

  const rowExecuted = await payload.findByID({
    collection: "staff-documents" as never,
    id: dualDocId,
    depth: 0,
    overrideAccess: true,
  });
  assert.equal(String((rowExecuted as { status?: string }).status), "executed");
  console.log("  ✓ finalize after storage recovery marks executed");

  const contractsAfter = await db.execute(sql`SELECT COUNT(*)::int AS c FROM contracts`);
  const contractsAfterN = Number(
    asRowList<{ c: number }>(contractsAfter as { rows?: { c: number }[] })[0]?.c ?? 0,
  );
  assert.equal(contractsAfterN, contractsBeforeN);
  console.log("  ✓ contracts table row count unchanged");

  for (const documentId of documentIds) {
    await db.execute(sql`DELETE FROM staff_document_files WHERE staff_document_id = ${documentId}`);
    await db.execute(sql`DELETE FROM staff_documents WHERE id = ${documentId}`);
  }
  for (const templateId of templateIds) {
    await db.execute(sql`DELETE FROM staff_document_templates WHERE id = ${templateId}`);
  }
  for (const userId of [staffA.id, staffB.id, adminUser.id]) {
    await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
  }

  console.log("\nverify:staff-documents-release-b-gate — pass\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
