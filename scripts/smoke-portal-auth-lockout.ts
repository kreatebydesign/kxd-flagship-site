/**
 * Live smoke for portal lockout fields + admin boundary helpers.
 * Run: KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/smoke-portal-auth-lockout.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";

async function main() {
  const payload = await getPayload({ config });
  const users = await payload.find({
    collection: "portal-users" as never,
    limit: 3,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  });

  console.log("portal users total:", users.totalDocs);
  for (const raw of users.docs) {
    const u = raw as {
      id: number;
      email?: string;
      active?: boolean;
      hash?: string;
      salt?: string;
    };
    console.log({
      id: u.id,
      email: u.email,
      active: u.active,
      hasHash: typeof u.hash === "string" && u.hash.length > 0,
      hasSalt: typeof u.salt === "string" && u.salt.length > 0,
    });
  }

  const email = (users.docs[0] as { email?: string } | undefined)?.email;
  if (!email) {
    console.log("No portal user available for failed-login lockout smoke.");
    return;
  }

  try {
    await payload.login({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      data: { email, password: "__definitely_wrong_password__" },
    });
    console.log("unexpected: wrong password succeeded");
  } catch (err) {
    console.log(
      "wrong password rejected:",
      err instanceof Error ? err.name : typeof err,
    );
  }

  const after = await payload.find({
    collection: "portal-users" as never,
    where: { email: { equals: email } } as never,
    limit: 1,
    showHiddenFields: true,
    overrideAccess: true,
  });
  const doc = after.docs[0] as {
    loginAttempts?: number;
    lockUntil?: string | null;
  };
  console.log("lockout fields after failed attempt:", {
    loginAttempts: doc?.loginAttempts ?? null,
    lockUntil: doc?.lockUntil ?? null,
  });

  const isPayloadAdmin = (user: { collection?: string } | null) => {
    if (!user) return false;
    if (user.collection === "portal-users") return false;
    return user.collection === "users" || user.collection === undefined;
  };
  console.log(
    "portal-users JWT authorizes admin?",
    isPayloadAdmin({ collection: "portal-users" }),
  );
  console.log(
    "users JWT authorizes admin?",
    isPayloadAdmin({ collection: "users" }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
