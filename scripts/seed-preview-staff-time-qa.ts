/**
 * Seed dedicated preview-only Staff Time QA users on preview-kxd-os.
 *
 *   KXD_CONFIRM_PREVIEW_DB_WRITE=1 DATABASE_URI=... npx tsx scripts/seed-preview-staff-time-qa.ts
 *
 * Credentials are written to a local file (default /tmp/kxd-preview-qa-credentials.json, mode 0600).
 * Never commit that file.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { staffActorFromUser } from "../lib/staff/actor.ts";
import {
  assertPreviewKxdOsDatabase,
  PREVIEW_QA_EMAIL_DOMAIN,
} from "./lib/preview-kxd-os-db.ts";

const CREDENTIALS_PATH =
  process.env.KXD_PREVIEW_QA_CREDENTIALS_PATH?.trim() ||
  "/tmp/kxd-preview-qa-credentials.json";

const BDS_EMAIL = `preview-qa-bds@${PREVIEW_QA_EMAIL_DOMAIN}`;
const BDS_OTHER_EMAIL = `preview-qa-bds-other@${PREVIEW_QA_EMAIL_DOMAIN}`;
const OPERATOR_EMAIL = `preview-qa-operator@${PREVIEW_QA_EMAIL_DOMAIN}`;

function randomPassword(): string {
  return crypto.randomBytes(18).toString("base64url");
}

async function upsertUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  spec: {
    email: string;
    displayName: string;
    role: "editor" | "admin";
    staffRole: "business_development_specialist" | "none";
    password: string;
  },
): Promise<number> {
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: spec.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs[0]) {
    await payload.update({
      collection: "users",
      id: existing.docs[0].id,
      data: {
        password: spec.password,
        displayName: spec.displayName,
        role: spec.role,
        staffRole: spec.staffRole,
        staffOnboardingCompletedAt: new Date().toISOString(),
      } as never,
      overrideAccess: true,
    });
    return Number(existing.docs[0].id);
  }
  const doc = await payload.create({
    collection: "users",
    data: {
      email: spec.email,
      password: spec.password,
      displayName: spec.displayName,
      role: spec.role,
      staffRole: spec.staffRole,
      staffOnboardingCompletedAt: new Date().toISOString(),
    } as never,
    overrideAccess: true,
  });
  return Number(doc.id);
}

async function main(): Promise<void> {
  assertPreviewKxdOsDatabase();
  const bdsPassword = randomPassword();
  const operatorPassword = randomPassword();

  const payload = await getPayload({ config });
  const bdsUserId = await upsertUser(payload, {
    email: BDS_EMAIL,
    displayName: "Preview QA BDS",
    role: "editor",
    staffRole: "business_development_specialist",
    password: bdsPassword,
  });
  const bdsOtherUserId = await upsertUser(payload, {
    email: BDS_OTHER_EMAIL,
    displayName: "Preview QA BDS Other",
    role: "editor",
    staffRole: "business_development_specialist",
    password: randomPassword(),
  });
  const operatorUserId = await upsertUser(payload, {
    email: OPERATOR_EMAIL,
    displayName: "Preview QA Operator",
    role: "admin",
    staffRole: "none",
    password: operatorPassword,
  });

  const bdsActor = staffActorFromUser(
    await payload.findByID({
      collection: "users",
      id: bdsUserId,
      depth: 0,
      overrideAccess: true,
    }),
  );
  const operatorActor = staffActorFromUser(
    await payload.findByID({
      collection: "users",
      id: operatorUserId,
      depth: 0,
      overrideAccess: true,
    }),
  );
  if (!bdsActor || !operatorActor) {
    throw new Error("Failed to resolve preview QA staff actors.");
  }

  const payloadOut = {
    createdAt: new Date().toISOString(),
    previewBranch: "preview-kxd-os",
    users: {
      bds: { email: BDS_EMAIL, userId: bdsUserId, password: bdsPassword },
      bdsOther: { email: BDS_OTHER_EMAIL, userId: bdsOtherUserId },
      operator: {
        email: OPERATOR_EMAIL,
        userId: operatorUserId,
        password: operatorPassword,
      },
    },
  };
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(payloadOut, null, 2), {
    mode: 0o600,
  });

  console.log("seed-preview-staff-time-qa: OK");
  console.log(`[KXD] QA user emails: ${BDS_EMAIL}, ${OPERATOR_EMAIL}`);
  console.log(
    `[KXD] Credentials file (local only, not for reports): ${path.resolve(CREDENTIALS_PATH)}`,
  );
  await payload.destroy?.();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
