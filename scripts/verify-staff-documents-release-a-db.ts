/**
 * Release A — disposable Postgres validation (migration + full lifecycle).
 *
 *   STAFF_DOC_RELEASE_A_DB_VALIDATION=1 KXD_SERVER_ONLY_SHIM=1 \
 *     node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/verify-staff-documents-release-a-db.ts
 *
 * Requires DATABASE_URL (or DATABASE_URI) to a disposable branch — never production main.
 */
import assert from "node:assert/strict";

const enabled = process.env.STAFF_DOC_RELEASE_A_DB_VALIDATION === "1";
if (!enabled) {
  console.log(
    "\nverify:staff-documents-release-a-db — skipped (set STAFF_DOC_RELEASE_A_DB_VALIDATION=1)\n",
  );
  process.exit(0);
}

const runTag = `pr79-db-${Date.now()}`;
const testEmailA = `${runTag}-staff-a@kxd-validation.invalid`;
const testEmailB = `${runTag}-staff-b@kxd-validation.invalid`;
const testEmailAdmin = `${runTag}-admin@kxd-validation.invalid`;

type CleanupIds = {
  userIds: number[];
  templateIds: number[];
  documentIds: number[];
  fileIds: number[];
};

const cleanup: CleanupIds = {
  userIds: [],
  templateIds: [],
  documentIds: [],
  fileIds: [],
};

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

const RELEASE_A_MIGRATION_NAME = "20261020_staff_documents_release_a";

async function ensureReleaseAMigration(
  db: NonNullable<ReturnType<typeof import("../lib/connect/db.ts").getConnectPostgresExecutor>>,
): Promise<void> {
  const { sql } = await import("@payloadcms/db-postgres");
  const { asRowList } = await import("../lib/connect/db.ts");

  for (const table of [
    "staff_document_templates",
    "staff_documents",
    "staff_document_files",
  ]) {
    assert.equal(
      await tableExists(db, sql, table),
      true,
      `missing table ${table} — apply migration ${RELEASE_A_MIGRATION_NAME} first`,
    );
  }

  const existing = await db.execute(sql`
    SELECT name FROM payload_migrations WHERE name = ${RELEASE_A_MIGRATION_NAME} LIMIT 1
  `);
  if (asRowList<{ name: string }>(existing as { rows?: { name: string }[] }).length > 0) {
    return;
  }

  const batchResult = await db.execute(sql`
    SELECT COALESCE(MAX(batch), 0) + 1 AS next FROM payload_migrations
  `);
  const batch = Number(
    asRowList<{ next: number }>(batchResult as { rows?: { next: number }[] })[0]?.next ?? 1,
  );
  await db.execute(sql`
    INSERT INTO payload_migrations (name, batch, updated_at, created_at)
    VALUES (${RELEASE_A_MIGRATION_NAME}, ${batch}, now(), now())
  `);
}

async function tableExists(
  db: { execute: (q: unknown) => Promise<unknown> },
  sqlTag: typeof import("@payloadcms/db-postgres").sql,
  name: string,
): Promise<boolean> {
  const { asRowList } = await import("../lib/connect/db.ts");
  const result = await db.execute(sqlTag`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
    LIMIT 1
  `);
  return asRowList<{ "?column?": number }>(result as { rows?: { "?column?": number }[] }).length > 0;
}

async function countContracts(db: { execute: (q: unknown) => Promise<unknown> }): Promise<number> {
  const { asRowList } = await import("../lib/connect/db.ts");
  const { sql } = await import("@payloadcms/db-postgres");
  const result = await db.execute(sql`SELECT COUNT(*)::int AS c FROM contracts`);
  const row = asRowList<{ c: number }>(result as { rows?: { c: number }[] })[0];
  return Number(row?.c ?? 0);
}

async function countCommercialDocuments(
  db: { execute: (q: unknown) => Promise<unknown> },
): Promise<number> {
  const { asRowList } = await import("../lib/connect/db.ts");
  const { sql } = await import("@payloadcms/db-postgres");
  const result = await db.execute(
    sql`SELECT COUNT(*)::int AS c FROM commercial_documents`,
  );
  const row = asRowList<{ c: number }>(result as { rows?: { c: number }[] })[0];
  return Number(row?.c ?? 0);
}

async function main(): Promise<void> {
  const dbUrl =
    process.env.STAFF_DOC_DISPOSABLE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URI?.trim();
  if (!dbUrl) {
    throw new Error(
      "STAFF_DOC_DISPOSABLE_DATABASE_URL or DATABASE_URL required for disposable validation.",
    );
  }
  process.env.DATABASE_URL = dbUrl;
  process.env.DATABASE_URI = dbUrl;

  const host = new URL(dbUrl).hostname;
  console.log(`\nverify:staff-documents-release-a-db`);
  console.log(`  host=${host}`);
  console.log(`  runTag=${runTag}\n`);

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const { sql } = await import("@payloadcms/db-postgres");
  const { getConnectPostgresExecutor, asRowList } = await import("../lib/connect/db.ts");
  const {
    SAMPLE_NONBINDING_POLICY_BODY,
    SAMPLE_NONBINDING_POLICY_TITLE,
  } = await import("../lib/staff-documents/constants.ts");
  const {
    createStaffDocumentTemplate,
    updateStaffDocumentTemplateStatus,
    assignStaffDocumentFromTemplate,
    getStaffDocumentDetail,
    readStaffDocumentFileBytes,
    acknowledgeStaffDocument,
    listStaffDocumentsForOperator,
  } = await import("../lib/staff-documents/data.ts");
  const { claimStaffDocumentAcknowledgment } = await import(
    "../lib/staff-documents/acknowledge-claim.ts"
  );
  const { buildStaffAcknowledgment } = await import("../lib/staff-documents/acknowledgment.ts");
  const { hashStaffDocumentPdfBytes } = await import("../lib/staff-documents/hash.ts");
  const { verifyStaffDocumentIntegrity } = await import("../lib/staff-documents/integrity.ts");

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  assert.ok(db, "Postgres executor required");

  await ensureReleaseAMigration(db);

  const contractsBeforeN = await countContracts(db);
  const commercialBeforeN = await countCommercialDocuments(db);

  const adminUser = (await payload.create({
    collection: "users",
    data: {
      email: testEmailAdmin,
      password: "ValidationPass123!",
      displayName: "PR79 Admin",
      role: "admin",
      staffRole: "none",
    } as never,
    overrideAccess: true,
  })) as { id: number };
  cleanup.userIds.push(Number(adminUser.id));

  const staffA = (await payload.create({
    collection: "users",
    data: {
      email: testEmailA,
      password: "ValidationPass123!",
      displayName: "PR79 Staff A",
      role: "editor",
      staffRole: "operations_coordinator",
      staffOnboardingCompletedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  })) as { id: number };
  cleanup.userIds.push(Number(staffA.id));

  const staffB = (await payload.create({
    collection: "users",
    data: {
      email: testEmailB,
      password: "ValidationPass123!",
      displayName: "PR79 Staff B",
      role: "editor",
      staffRole: "operations_coordinator",
      staffOnboardingCompletedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  })) as { id: number };
  cleanup.userIds.push(Number(staffB.id));

  const adminActor = staffActor({
    id: Number(adminUser.id),
    email: testEmailAdmin,
    role: "admin",
    staffRole: "none",
  });
  const actorA = staffActor({
    id: Number(staffA.id),
    email: testEmailA,
    role: "editor",
    staffRole: "operations_coordinator",
  });
  const actorB = staffActor({
    id: Number(staffB.id),
    email: testEmailB,
    role: "editor",
    staffRole: "operations_coordinator",
  });

  const { id: templateId } = await createStaffDocumentTemplate({
    actor: adminActor,
    title: `${SAMPLE_NONBINDING_POLICY_TITLE} (${runTag})`,
    body: SAMPLE_NONBINDING_POLICY_BODY,
    useSample: false,
  });
  cleanup.templateIds.push(templateId);

  const templateRead = await payload.findByID({
    collection: "staff-document-templates" as never,
    id: templateId,
    depth: 0,
    overrideAccess: true,
  });
  assert.equal(String((templateRead as { status?: string }).status), "draft");

  await updateStaffDocumentTemplateStatus({
    actor: adminActor,
    templateId,
    status: "approved-for-use",
  });
  const templateApproved = await payload.findByID({
    collection: "staff-document-templates" as never,
    id: templateId,
    depth: 0,
    overrideAccess: true,
  });
  assert.equal(String((templateApproved as { status?: string }).status), "approved-for-use");

  const { documentId } = await assignStaffDocumentFromTemplate({
    actor: adminActor,
    templateId,
    staffUserId: Number(staffA.id),
  });
  cleanup.documentIds.push(documentId);

  const docRow = await payload.findByID({
    collection: "staff-documents" as never,
    id: documentId,
    depth: 0,
    overrideAccess: true,
  });
  assert.equal(String((docRow as { status?: string }).status), "assigned");

  const detailA = await getStaffDocumentDetail({ actor: actorA, documentId });
  assert.ok(detailA);
  assert.equal(detailA.status, "assigned");

  let crossDenied = false;
  try {
    await getStaffDocumentDetail({ actor: actorB, documentId });
  } catch {
    crossDenied = true;
  }
  assert.equal(crossDenied, true, "staff B must not read staff A document");

  assert.ok(detailA.policyFileId, "policy PDF file id required");
  const policyFile = await readStaffDocumentFileBytes({
    actor: actorA,
    fileId: detailA.policyFileId,
    staffDocumentId: documentId,
  });
  const policyHash = hashStaffDocumentPdfBytes(policyFile.buffer);
  const filesForDoc = await payload.find({
    collection: "staff-document-files" as never,
    where: { staffDocument: { equals: documentId } },
    limit: 10,
    overrideAccess: true,
  });
  const policyRow = (filesForDoc.docs as { id: number; contentHash?: string; kind?: string }[]).find(
    (f) => f.kind === "policy-pdf",
  );
  assert.ok(policyRow);
  assert.equal(policyRow.contentHash, policyHash);
  assert.equal(
    verifyStaffDocumentIntegrity({
      buffer: policyFile.buffer,
      contentHash: policyRow.contentHash ?? null,
    }).ok,
    true,
  );

  const { detail: afterAck, alreadyAcknowledged: firstAlready } =
    await acknowledgeStaffDocument({
      actor: actorA,
      documentId,
      legalName: "PR79 Staff A",
      typedAcknowledgment: "PR79 Staff A",
      electronicRecordsConsent: true,
      reviewedConfirmed: true,
      ipAddress: "127.0.0.1",
      userAgent: "pr79-validation",
    });
  assert.equal(firstAlready, false);
  assert.equal(afterAck.status, "acknowledged");
  assert.ok(afterAck.acknowledgmentFileId);

  const parallel = await Promise.all(
    Array.from({ length: 8 }, () =>
      acknowledgeStaffDocument({
        actor: actorA,
        documentId,
        legalName: "PR79 Staff A",
        typedAcknowledgment: "PR79 Staff A",
        electronicRecordsConsent: true,
        reviewedConfirmed: true,
      }),
    ),
  );
  assert.equal(
    parallel.filter((r) => r.alreadyAcknowledged).length,
    8,
    "all parallel acknowledges after first should be idempotent",
  );

  const ackFiles = await payload.find({
    collection: "staff-document-files" as never,
    where: {
      and: [
        { staffDocument: { equals: documentId } },
        { kind: { equals: "acknowledgment-record" } },
      ],
    },
    limit: 20,
    overrideAccess: true,
  });
  assert.equal(ackFiles.totalDocs, 1, "exactly one acknowledgment PDF row");

  const docFinal = await payload.findByID({
    collection: "staff-documents" as never,
    id: documentId,
    depth: 0,
    overrideAccess: true,
  });
  assert.equal(String((docFinal as { status?: string }).status), "acknowledged");
  assert.ok((docFinal as { acknowledgment?: unknown }).acknowledgment);

  const operatorList = await listStaffDocumentsForOperator();
  assert.ok(
    operatorList.some((row) => row.id === documentId && row.status === "acknowledged"),
    "operator must see completed acknowledgment",
  );

  const { documentId: raceDocId } = await assignStaffDocumentFromTemplate({
    actor: adminActor,
    templateId,
    staffUserId: Number(staffA.id),
  });
  cleanup.documentIds.push(raceDocId);

  const raceDoc = await payload.findByID({
    collection: "staff-documents" as never,
    id: raceDocId,
    depth: 0,
    overrideAccess: true,
  });
  const raceHash = String((raceDoc as { templateContentHash?: string }).templateContentHash ?? "");
  const raceAck = buildStaffAcknowledgment({
    legalName: "PR79 Staff A",
    email: testEmailA,
    typedAcknowledgment: "PR79 Staff A",
    electronicRecordsConsent: true,
    reviewedConfirmed: true,
    documentContentHash: raceHash,
  });
  const raceAudit = [
    {
      id: "audit-race",
      at: new Date().toISOString(),
      action: "staff.acknowledged",
      actor: testEmailA,
      reason: "race-test",
    },
  ];

  const raceResults = await Promise.all(
    Array.from({ length: 8 }, () =>
      claimStaffDocumentAcknowledgment({
        payload,
        documentId: raceDocId,
        staffUserId: Number(staffA.id),
        acknowledgment: raceAck,
        auditEvents: raceAudit,
      }),
    ),
  );
  const claimed = raceResults.filter((r) => r.kind === "claimed").length;
  const already = raceResults.filter((r) => r.kind === "already_acknowledged").length;
  assert.equal(claimed, 1, `race: expected 1 claimed, got ${claimed}`);
  assert.equal(already, 7, `race: expected 7 already_acknowledged, got ${already}`);

  const { documentId: revokedDocId } = await assignStaffDocumentFromTemplate({
    actor: adminActor,
    templateId,
    staffUserId: Number(staffA.id),
  });
  cleanup.documentIds.push(revokedDocId);
  await payload.update({
    collection: "staff-documents" as never,
    id: revokedDocId,
    data: { status: "revoked" } as never,
    overrideAccess: true,
  });
  let revokeBlocked = false;
  try {
    await acknowledgeStaffDocument({
      actor: actorA,
      documentId: revokedDocId,
      legalName: "PR79 Staff A",
      typedAcknowledgment: "PR79 Staff A",
      electronicRecordsConsent: true,
      reviewedConfirmed: true,
    });
  } catch {
    revokeBlocked = true;
  }
  assert.equal(revokeBlocked, true, "revoked document cannot be acknowledged");

  const contractsAfterN = await countContracts(db);
  const commercialAfterN = await countCommercialDocuments(db);
  assert.equal(contractsAfterN, contractsBeforeN);
  assert.equal(commercialAfterN, commercialBeforeN);

  console.log("  ✓ migration + CRUD + auth + PDF + acknowledge + concurrency + revoke");
  console.log("  ✓ contracts/commercial row counts unchanged\n");

  for (const documentId of cleanup.documentIds) {
    await db.execute(
      sql`DELETE FROM staff_document_files WHERE staff_document_id = ${documentId}`,
    );
    await db.execute(sql`DELETE FROM staff_documents WHERE id = ${documentId}`);
  }
  for (const templateId of cleanup.templateIds) {
    await db.execute(sql`DELETE FROM staff_document_templates WHERE id = ${templateId}`);
  }
  for (const userId of cleanup.userIds) {
    await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
  }

  console.log("verify:staff-documents-release-a-db — pass\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
