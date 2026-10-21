/**
 * Local-only browser QA users (localhost dev). Never run against production Neon.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { assertStaffTimeVerifyDatabase } from "./lib/staff-time-test-fixture.ts";

const OUT =
  process.env.KXD_LOCAL_QA_CREDENTIALS_PATH?.trim() ||
  "/tmp/kxd-local-staff-time-qa-credentials.json";

const BDS_EMAIL = "local-qa-bds@kxd-staff-time-verify.local";
const OPERATOR_EMAIL = "local-qa-operator@kxd-staff-time-verify.local";

async function main(): Promise<void> {
  assertStaffTimeVerifyDatabase();
  const payload = await getPayload({ config });
  const bdsPassword = crypto.randomBytes(16).toString("base64url");
  const operatorPassword = crypto.randomBytes(16).toString("base64url");

  async function upsert(
    email: string,
    spec: {
      displayName: string;
      role: "editor" | "admin";
      staffRole: "business_development_specialist" | "none";
      password: string;
    },
  ): Promise<void> {
    const found = await payload.find({
      collection: "users",
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (found.docs[0]) {
      await payload.update({
        collection: "users",
        id: found.docs[0].id,
        data: {
          displayName: spec.displayName,
          role: spec.role,
          staffRole: spec.staffRole,
          password: spec.password,
          staffOnboardingCompletedAt: new Date().toISOString(),
        } as never,
        overrideAccess: true,
      });
      return;
    }
    await payload.create({
      collection: "users",
      data: {
        email,
        displayName: spec.displayName,
        role: spec.role,
        staffRole: spec.staffRole,
        password: spec.password,
        staffOnboardingCompletedAt: new Date().toISOString(),
      } as never,
      overrideAccess: true,
    });
  }

  await upsert(BDS_EMAIL, {
    displayName: "Local QA BDS",
    role: "editor",
    staffRole: "business_development_specialist",
    password: bdsPassword,
  });
  await upsert(OPERATOR_EMAIL, {
    displayName: "Local QA Operator",
    role: "admin",
    staffRole: "none",
    password: operatorPassword,
  });

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        users: {
          bds: { email: BDS_EMAIL, password: bdsPassword },
          operator: { email: OPERATOR_EMAIL, password: operatorPassword },
        },
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );

  const loginCheck = await payload.login({
    collection: "users",
    data: { email: BDS_EMAIL, password: bdsPassword },
  });
  if (!loginCheck.user) {
    throw new Error("Local QA BDS login failed immediately after seed.");
  }

  console.log("seed-local-staff-time-browser-qa: OK");
  console.log(`[KXD] credentials: ${path.resolve(OUT)}`);
  await payload.destroy?.();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
