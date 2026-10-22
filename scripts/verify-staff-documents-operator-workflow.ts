/**
 * Staff document operator template workflow — disposable Postgres only.
 *
 *   STAFF_DOC_OPERATOR_WORKFLOW=1 KXD_SERVER_ONLY_SHIM=1 \
 *     node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/verify-staff-documents-operator-workflow.ts
 */
import assert from "node:assert/strict";

const enabled = process.env.STAFF_DOC_OPERATOR_WORKFLOW === "1";
if (!enabled) {
  console.log(
    "\nverify:staff-documents-operator-workflow — skipped (set STAFF_DOC_OPERATOR_WORKFLOW=1)\n",
  );
  process.exit(0);
}

process.env.STAFF_DOC_QA_ASSIGNMENT = "1";

const OPERATOR_MIGRATION = "20261024_staff_document_template_operator_workflow";
const runTag = `operator-wf-${Date.now()}`;

async function ensureOperatorMigration(
  db: NonNullable<ReturnType<typeof import("../lib/connect/db.ts").getConnectPostgresExecutor>>,
): Promise<void> {
  const { sql } = await import("@payloadcms/db-postgres");
  const { asRowList } = await import("../lib/connect/db.ts");

  const col = await db.execute(sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_document_templates'
      AND column_name = 'is_sample'
    LIMIT 1
  `);
  if (asRowList(col as { rows?: unknown[] }).length === 0) {
    const { up } = await import("../migrations/20261024_staff_document_template_operator_workflow.ts");
    await up({ db } as import("@payloadcms/db-postgres").MigrateUpArgs);
  }

  const existing = await db.execute(sql`
    SELECT name FROM payload_migrations WHERE name = ${OPERATOR_MIGRATION} LIMIT 1
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
      VALUES (${OPERATOR_MIGRATION}, ${batch}, now(), now())
    `);
  }
}

async function main(): Promise<void> {
  const dbUrl =
    process.env.STAFF_DOC_DISPOSABLE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URI?.trim();
  if (!dbUrl) {
    throw new Error("STAFF_DOC_DISPOSABLE_DATABASE_URL or DATABASE_URL required.");
  }
  if (process.env.KXD_DATABASE_IS_PRODUCTION === "1") {
    throw new Error("Refusing to run operator workflow verification on production.");
  }

  process.env.DATABASE_URL = dbUrl;
  process.env.DATABASE_URI = dbUrl;

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const payload = await getPayload({ config });
  const { getConnectPostgresExecutor } = await import("../lib/connect/db.ts");
  const db = getConnectPostgresExecutor(payload);
  if (!db) throw new Error("Could not connect to disposable database.");

  await ensureOperatorMigration(db);

  const {
    createRealStaffDocumentTemplate,
    updateStaffDocumentTemplateDraft,
    transitionStaffDocumentTemplateStatus,
    createStaffDocumentTemplateNewVersion,
    getStaffDocumentTemplateForOperator,
  } = await import("../lib/staff-documents/template-operator.ts");
  const { createStaffDocumentTemplate, assignStaffDocumentFromTemplate } = await import(
    "../lib/staff-documents/data.ts"
  );
  const { renderStaffDocumentTemplatePreviewPdf } = await import(
    "../lib/staff-documents/export-pdf.tsx"
  );
  const adminActor = {
    userId: 1,
    email: `operator-${runTag}@kreatebydesign.com`,
    displayName: "Operator Verify",
    role: "admin" as const,
    staffRole: "none" as const,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  };

  const staffUser = await payload.create({
    collection: "users",
    data: {
      email: `staff-${runTag}@kreatebydesign.com`,
      displayName: "Verify Staff",
      role: "editor",
      staffRole: "operations_coordinator",
      password: `Test-${runTag}`,
    } as never,
    overrideAccess: true,
  });

  const { id: templateId } = await createRealStaffDocumentTemplate({
    actor: adminActor,
    title: `Confidentiality Agreement ${runTag}`,
    body: `Counsel-reviewed placeholder body for ${runTag}.`,
    kind: "confidentiality-nda",
  });

  await updateStaffDocumentTemplateDraft({
    actor: adminActor,
    templateId,
    body: "PENDING_BODY_LOAD",
  });
  await assert.rejects(() =>
    transitionStaffDocumentTemplateStatus({
      actor: adminActor,
      templateId,
      status: "legal-review",
    }),
    /incomplete|placeholder/i,
  );

  await updateStaffDocumentTemplateDraft({
    actor: adminActor,
    templateId,
    body: `Updated body for ${runTag}.`,
  });

  const draft = await getStaffDocumentTemplateForOperator(templateId);
  assert.ok(draft);
  assert.equal(draft.status, "draft");
  assert.equal(draft.editable, true);

  await transitionStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId,
    status: "legal-review",
  });
  await transitionStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId,
    status: "approved-for-use",
  });

  const approved = await getStaffDocumentTemplateForOperator(templateId);
  assert.ok(approved);
  assert.equal(approved.status, "approved-for-use");
  assert.equal(approved.assignable, true);
  assert.equal(approved.editable, false);

  const hashBefore = approved.contentHash;
  await assert.rejects(() =>
    updateStaffDocumentTemplateDraft({
      actor: adminActor,
      templateId,
      title: "Should fail",
    }),
  );

  const { id: v2Id } = await createStaffDocumentTemplateNewVersion({
    actor: adminActor,
    templateId,
  });
  const v2 = await getStaffDocumentTemplateForOperator(v2Id);
  assert.ok(v2);
  assert.equal(v2.version, approved.version + 1);
  assert.equal(v2.status, "draft");

  const pdf = await renderStaffDocumentTemplatePreviewPdf({
    title: approved.title,
    body: approved.body,
    legalEntityName: approved.legalEntityName,
    templateVersion: approved.version,
    contentHash: hashBefore,
    kind: approved.kind,
    signingMode: approved.signingMode,
  });
  assert.ok(pdf.length > 500);

  const { documentId } = await assignStaffDocumentFromTemplate({
    actor: adminActor,
    templateId,
    staffUserId: Number(staffUser.id),
  });
  assert.ok(documentId > 0);

  const assignedBeforeV2 = await payload.findByID({
    collection: "staff-documents" as never,
    id: documentId,
    depth: 0,
    overrideAccess: true,
  });
  const snapshotHash = String(
    (assignedBeforeV2 as { templateContentHash?: string }).templateContentHash ?? "",
  );
  assert.equal(snapshotHash, hashBefore);

  await updateStaffDocumentTemplateDraft({
    actor: adminActor,
    templateId: v2Id,
    body: `Version 2 body for ${runTag}.`,
  });
  await transitionStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId: v2Id,
    status: "legal-review",
  });
  await transitionStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId: v2Id,
    status: "approved-for-use",
  });

  const v1After = await getStaffDocumentTemplateForOperator(templateId);
  const v2After = await getStaffDocumentTemplateForOperator(v2Id);
  assert.ok(v1After);
  assert.ok(v2After);
  assert.equal(v1After.status, "retired");
  assert.equal(v2After.status, "approved-for-use");
  assert.equal(v2After.assignable, true);

  const assignedAfterV2 = await payload.findByID({
    collection: "staff-documents" as never,
    id: documentId,
    depth: 0,
    overrideAccess: true,
  });
  assert.equal(
    String((assignedAfterV2 as { templateContentHash?: string }).templateContentHash ?? ""),
    snapshotHash,
  );
  assert.equal(Number((assignedAfterV2 as { template?: number }).template ?? 0), templateId);

  const { id: sampleId } = await createStaffDocumentTemplate({
    actor: adminActor,
    useSample: true,
    kind: "policy-acknowledgment",
    title: "",
    body: "",
  });
  await transitionStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId: sampleId,
    status: "approved-for-use",
  });

  delete process.env.STAFF_DOC_QA_ASSIGNMENT;
  await assert.rejects(() =>
    transitionStaffDocumentTemplateStatus({
      actor: adminActor,
      templateId: sampleId,
      status: "legal-review",
    }),
  );
  await assert.rejects(() =>
    assignStaffDocumentFromTemplate({
      actor: adminActor,
      templateId: sampleId,
      staffUserId: Number(staffUser.id),
    }),
  );

  console.log("\n  ✓ staff document operator workflow (disposable DB)\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
