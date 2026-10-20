/**
 * Concurrency regression for dual-signature claims (Postgres required).
 *   STAFF_DOC_B_CONCURRENCY_TEST=1 KXD_SERVER_ONLY_SHIM=1 \
 *     node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/verify-staff-documents-release-b-concurrency.ts
 */
import assert from "node:assert/strict";

const enabled = process.env.STAFF_DOC_B_CONCURRENCY_TEST === "1";
if (!enabled) {
  console.log(
    "\nverify:staff-documents-release-b-concurrency — skipped (set STAFF_DOC_B_CONCURRENCY_TEST=1)\n",
  );
  process.exit(0);
}

async function main() {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const { claimStaffDocumentEmployeeSignature } = await import(
    "../lib/staff-documents/employee-sign-claim.ts"
  );
  const { claimStaffDocumentOperatorCountersignature } = await import(
    "../lib/staff-documents/operator-countersign-claim.ts"
  );
  const { claimStaffDocumentExecuted } = await import(
    "../lib/staff-documents/execution-finalize.ts"
  );
  const { buildStaffSignatureEvidence } = await import("../lib/staff-documents/signature.ts");
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

  const body = "[CONCURRENCY TEST B] Nonbinding agreement body.";
  const contentHash = hashStaffDocumentBody(body);

  const doc = await payload.create({
    collection: "staff-documents" as never,
    data: {
      staffUser: staffUser.id,
      templateVersion: 1,
      templateContentHash: contentHash,
      title: "[TEST] Concurrency agreement",
      kind: "employment-agreement",
      signingMode: "dual-signature",
      status: "assigned",
      legalEntityName: "Kreate by Design LLC",
      bodySnapshot: body,
    } as never,
    overrideAccess: true,
  });

  const documentId = Number((doc as { id: number }).id);
  const staffUserId = Number(staffUser.id);

  const employeeSig = buildStaffSignatureEvidence({
    legalName: "Concurrency Tester",
    title: "Tester",
    entityName: "Concurrency Tester",
    email: "concurrency-test@example.com",
    typedAcknowledgment: "Concurrency Tester",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actorRole: "staff-employee",
    documentContentHash: contentHash,
  });

  const audit = [{ id: "a1", at: new Date().toISOString(), action: "test" }];

  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      claimStaffDocumentEmployeeSignature({
        payload,
        documentId,
        staffUserId,
        employeeSignature: employeeSig,
        auditEvents: audit,
      }),
    ),
  );

  const claimed = results.filter((r) => r.kind === "claimed");
  const already = results.filter((r) => r.kind === "already_signed");
  assert.equal(claimed.length, 1);
  assert.equal(already.length, 7);

  const operatorSig = buildStaffSignatureEvidence({
    legalName: "Matt Lunger",
    title: "Founder",
    entityName: "Kreate by Design LLC",
    email: "matt@kreatebydesign.com",
    typedAcknowledgment: "Matt Lunger",
    authorityConfirmed: true,
    electronicRecordsConsent: true,
    actorRole: "kxd-employer-representative",
    documentContentHash: contentHash,
    priorSignatureHash: employeeSig.signatureHash,
  });

  const opResults = await Promise.all(
    Array.from({ length: 6 }, () =>
      claimStaffDocumentOperatorCountersignature({
        payload,
        documentId,
        operatorSignature: operatorSig,
        auditEvents: audit,
      }),
    ),
  );
  assert.equal(opResults.filter((r) => r.kind === "claimed").length, 1);
  assert.equal(opResults.filter((r) => r.kind === "already_executing").length, 5);

  const finResults = await Promise.all(
    Array.from({ length: 4 }, () =>
      claimStaffDocumentExecuted({
        payload,
        documentId,
        executedAt: new Date().toISOString(),
        auditEvents: audit,
      }),
    ),
  );
  assert.equal(finResults.filter((r) => r.kind === "finalized").length, 1);
  assert.equal(finResults.filter((r) => r.kind === "already_executed").length, 3);

  await db.execute(sql`DELETE FROM staff_documents WHERE id = ${documentId}`);

  console.log("  ✓ staff documents release B concurrency checks passed\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
