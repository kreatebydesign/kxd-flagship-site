/**
 * Concurrency regression for staff document acknowledgment (Postgres required).
 *   STAFF_DOC_CONCURRENCY_TEST=1 KXD_SERVER_ONLY_SHIM=1 \
 *     node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/verify-staff-documents-concurrency.ts
 */
import assert from "node:assert/strict";

const enabled = process.env.STAFF_DOC_CONCURRENCY_TEST === "1";
if (!enabled) {
  console.log("\nverify:staff-documents-concurrency — skipped (set STAFF_DOC_CONCURRENCY_TEST=1)\n");
  process.exit(0);
}

async function main() {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const { claimStaffDocumentAcknowledgment } = await import(
    "../lib/staff-documents/acknowledge-claim.ts"
  );
  const { buildStaffAcknowledgment } = await import("../lib/staff-documents/acknowledgment.ts");
  const { hashStaffDocumentBody } = await import("../lib/staff-documents/hash.ts");
  const { sql } = await import("@payloadcms/db-postgres");
  const { getConnectPostgresExecutor } = await import("../lib/connect/db.ts");

  const payload = await getPayload({ config });
  const db = getConnectPostgresExecutor(payload);
  if (!db) {
    console.error("Postgres adapter required.");
    process.exit(1);
  }

  const users = await payload.find({
    collection: "users",
    where: { staffRole: { not_equals: "none" } },
    limit: 1,
    overrideAccess: true,
  });
  const staffUser = users.docs[0] as { id: number } | undefined;
  if (!staffUser?.id) {
    console.error("No staff user found for concurrency test.");
    process.exit(1);
  }

  const body = "[CONCURRENCY TEST] Nonbinding sample policy body.";
  const contentHash = hashStaffDocumentBody(body);

  const template = await payload.create({
    collection: "staff-document-templates" as never,
    data: {
      title: "[TEST] Concurrency policy",
      slug: `concurrency-test-${Date.now()}`,
      version: 1,
      kind: "policy-acknowledgment",
      status: "approved-for-use",
      body,
      contentHash,
      legalEntityName: "Kreate by Design LLC",
    } as never,
    overrideAccess: true,
  });

  const doc = await payload.create({
    collection: "staff-documents" as never,
    data: {
      staffUser: staffUser.id,
      template: template.id,
      templateVersion: 1,
      templateContentHash: contentHash,
      title: "[TEST] Concurrency policy",
      kind: "policy-acknowledgment",
      status: "assigned",
      legalEntityName: "Kreate by Design LLC",
      bodySnapshot: body,
    } as never,
    overrideAccess: true,
  });

  const documentId = Number((doc as { id: number }).id);
  const staffUserId = Number(staffUser.id);

  const acknowledgment = buildStaffAcknowledgment({
    legalName: "Concurrency Tester",
    email: "concurrency-test@kreatebydesign.com",
    typedAcknowledgment: "Concurrency Tester",
    electronicRecordsConsent: true,
    reviewedConfirmed: true,
    documentContentHash: contentHash,
  });

  const auditEvents = [
    {
      id: "audit-test",
      at: new Date().toISOString(),
      action: "staff.acknowledged",
      actor: "concurrency-test@kreatebydesign.com",
      reason: "test",
    },
  ];

  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      claimStaffDocumentAcknowledgment({
        payload,
        documentId,
        staffUserId,
        acknowledgment,
        auditEvents,
      }),
    ),
  );

  const claimed = results.filter((r) => r.kind === "claimed").length;
  const already = results.filter((r) => r.kind === "already_acknowledged").length;
  assert.equal(claimed, 1, `expected exactly one claimed, got ${claimed}`);
  assert.equal(already, 7, `expected seven already_acknowledged, got ${already}`);

  const files = await payload.find({
    collection: "staff-document-files" as never,
    where: {
      and: [
        { staffDocument: { equals: documentId } },
        { kind: { equals: "acknowledgment-record" } },
      ],
    },
    limit: 10,
    overrideAccess: true,
  });
  assert.equal(files.totalDocs, 0, "claim test should not create PDF rows");

  await db.execute(sql`DELETE FROM staff_document_files WHERE staff_document_id = ${documentId}`);
  await db.execute(sql`DELETE FROM staff_documents WHERE id = ${documentId}`);
  await db.execute(sql`DELETE FROM staff_document_templates WHERE id = ${Number(template.id)}`);

  console.log("\nverify:staff-documents-concurrency — pass\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
