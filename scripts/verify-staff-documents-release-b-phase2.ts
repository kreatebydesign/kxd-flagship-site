/**
 * Release B Phase 2 — full employee → operator → executed lifecycle (disposable DB).
 *
 *   STAFF_DOC_RELEASE_B_PHASE2=1 KXD_SERVER_ONLY_SHIM=1 \
 *     node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/verify-staff-documents-release-b-phase2.ts
 */
import assert from "node:assert/strict";

const enabled = process.env.STAFF_DOC_RELEASE_B_PHASE2 === "1";
if (!enabled) {
  console.log(
    "\nverify:staff-documents-release-b-phase2 — skipped (set STAFF_DOC_RELEASE_B_PHASE2=1)\n",
  );
  process.exit(0);
}

const runTag = `pr82-phase2-${Date.now()}`;
const RELEASE_B_MIGRATION = "20261021_staff_documents_release_b_phase1";
const NONBINDING_BODY = `[NONBINDING TEST ONLY — ${runTag}]\nSynthetic agreement body for Phase 2 validation.`;

async function ensureReleaseBMigration(
  db: NonNullable<ReturnType<typeof import("../lib/connect/db.ts").getConnectPostgresExecutor>>,
): Promise<void> {
  const { sql } = await import("@payloadcms/db-postgres");
  const { asRowList } = await import("../lib/connect/db.ts");
  const col = await db.execute(sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_documents' AND column_name = 'employee_signature'
    LIMIT 1
  `);
  if (asRowList(col as { rows?: unknown[] }).length === 0) {
    const { up } = await import("../migrations/20261021_staff_documents_release_b_phase1.ts");
    await up({ db } as import("@payloadcms/db-postgres").MigrateUpArgs);
  }
  const existing = await db.execute(sql`
    SELECT name FROM payload_migrations WHERE name = ${RELEASE_B_MIGRATION} LIMIT 1
  `);
  if (asRowList(existing as { rows?: { name: string }[] }).length === 0) {
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
  if (!dbUrl) throw new Error("STAFF_DOC_DISPOSABLE_DATABASE_URL or DATABASE_URL required.");
  process.env.DATABASE_URL = dbUrl;
  process.env.DATABASE_URI = dbUrl;

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const { getConnectPostgresExecutor } = await import("../lib/connect/db.ts");
  const {
    createStaffDocumentTemplate,
    updateStaffDocumentTemplateStatus,
    assignStaffDocumentFromTemplate,
    acknowledgeStaffDocument,
    signStaffDocumentAsEmployee,
    countersignStaffDocumentAsOperator,
    readStaffDocumentFileBytes,
    getStaffDocumentDetail,
  } = await import("../lib/staff-documents/data.ts");
  const { hashStaffDocumentPdfBytes } = await import("../lib/staff-documents/hash.ts");
  const { renderStaffExecutedAgreementPdf } = await import("../lib/staff-documents/export-pdf.tsx");
  const { buildStaffSignatureEvidence } = await import("../lib/staff-documents/signature.ts");

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  assert.ok(db);
  await ensureReleaseBMigration(db);

  const adminUser = (await payload.create({
    collection: "users",
    data: {
      email: `${runTag}-admin@kxd-validation.invalid`,
      password: "ValidationPass123!",
      displayName: "Phase2 Admin",
      role: "admin",
      staffRole: "none",
    } as never,
    overrideAccess: true,
  })) as { id: number; email: string };

  const staffUser = (await payload.create({
    collection: "users",
    data: {
      email: `${runTag}-staff@kxd-validation.invalid`,
      password: "ValidationPass123!",
      displayName: "Phase2 Staff",
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
  const employeeActor = staffActor({
    id: Number(staffUser.id),
    email: staffUser.email,
    role: "editor",
    staffRole: "operations_coordinator",
  });

  const { id: policyTpl } = await createStaffDocumentTemplate({
    actor: adminActor,
    title: `[TEST policy] ${runTag}`,
    body: NONBINDING_BODY,
    kind: "policy-acknowledgment",
  });
  await updateStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId: policyTpl,
    status: "approved-for-use",
  });
  const { documentId: policyDocId } = await assignStaffDocumentFromTemplate({
    actor: adminActor,
    templateId: policyTpl,
    staffUserId: Number(staffUser.id),
  });
  const ack = await acknowledgeStaffDocument({
    actor: employeeActor,
    documentId: policyDocId,
    legalName: "Phase2 Staff",
    typedAcknowledgment: "Phase2 Staff",
    electronicRecordsConsent: true,
    reviewedConfirmed: true,
  });
  assert.equal(ack.detail.status, "acknowledged");
  console.log("  ✓ Release A acknowledgment regression");

  const { id: agrTpl } = await createStaffDocumentTemplate({
    actor: adminActor,
    title: `[TEST agreement] ${runTag}`,
    body: NONBINDING_BODY,
    kind: "employment-agreement",
  });
  await updateStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId: agrTpl,
    status: "approved-for-use",
  });
  const { documentId: agrDocId } = await assignStaffDocumentFromTemplate({
    actor: adminActor,
    templateId: agrTpl,
    staffUserId: Number(staffUser.id),
  });

  const signed = await signStaffDocumentAsEmployee({
    actor: employeeActor,
    documentId: agrDocId,
    legalName: "Phase2 Staff",
    title: "Staff",
    entityName: "Phase2 Staff",
    typedAcknowledgment: "Phase2 Staff",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
  });
  assert.equal(signed.detail.status, "awaiting-operator-signature");
  console.log("  ✓ employee sign → awaiting-operator-signature");

  const countersigned = await countersignStaffDocumentAsOperator({
    actor: adminActor,
    documentId: agrDocId,
    legalName: "Phase2 Admin",
    title: "Admin",
    entityName: "Kreate by Design LLC",
    typedAcknowledgment: "Phase2 Admin",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
  });
  assert.equal(countersigned.detail.status, "executed");
  assert.ok(countersigned.detail.executedAgreementFileId);
  console.log("  ✓ operator countersign → executed + PDF filed");

  const file = await readStaffDocumentFileBytes({
    actor: employeeActor,
    fileId: countersigned.detail.executedAgreementFileId!,
    staffDocumentId: agrDocId,
  });
  assert.ok(file.buffer.byteLength > 500);
  const storedHash = hashStaffDocumentPdfBytes(file.buffer);
  assert.ok(storedHash.length === 64);

  const row = await getStaffDocumentDetail({ actor: employeeActor, documentId: agrDocId });
  assert.ok(row?.employeeSignature);
  assert.ok(row?.operatorSignature);
  const pdf = await renderStaffExecutedAgreementPdf({
    title: row!.title,
    body: row!.bodySnapshot,
    legalEntityName: row!.legalEntityName,
    templateVersion: row!.templateVersion,
    contentHash: row!.templateContentHash,
    kind: row!.kind,
    employeeSignature: row!.employeeSignature!,
    operatorSignature: row!.operatorSignature!,
    executedAt: row!.executedAt ?? new Date().toISOString(),
    auditEvents: [],
  });
  assert.ok(pdf.byteLength > 500);
  console.log("  ✓ executed PDF render + stored file integrity");

  assert.throws(() =>
    buildStaffSignatureEvidence({
      legalName: "Phase2 Staff",
      title: "Staff",
      entityName: "Phase2 Staff",
      email: staffUser.email,
      typedAcknowledgment: "Wrong Name",
      authorityConfirmed: true,
      electronicRecordsConsent: true,
      actorRole: "staff-employee",
      documentContentHash: row!.templateContentHash,
    }),
  );
  console.log("  ✓ typed legal name validation");

  const { sql } = await import("@payloadcms/db-postgres");
  for (const documentId of [policyDocId, agrDocId]) {
    await db.execute(sql`DELETE FROM staff_document_files WHERE staff_document_id = ${documentId}`);
    await db.execute(sql`DELETE FROM staff_documents WHERE id = ${documentId}`);
  }
  for (const templateId of [policyTpl, agrTpl]) {
    await db.execute(sql`DELETE FROM staff_document_templates WHERE id = ${templateId}`);
  }
  for (const userId of [staffUser.id, adminUser.id]) {
    await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
  }

  console.log("\nverify:staff-documents-release-b-phase2 — pass\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
