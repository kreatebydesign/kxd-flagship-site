/**
 * seed-portal-user.ts
 *
 * Create or reset a portal user password via Payload API (reliable hashing).
 * Run: npm run seed:portal-user
 *
 * Examples:
 *   npm run seed:portal-user -- --email adam@primalmotorsports.com --password 'TempPass123!' --client primal-motorsports --display-name Adam
 *   npm run seed:portal-user -- --email tyler@primalmotorsports.com --password 'TempPass123!' --client primal-motorsports --display-name Tyler
 */

import { getPayload } from "payload";
import config from "../payload.config";

const DEFAULTS = {
  email: "matt.primal@kxd.local",
  password: "Primal123!",
  clientSlug: "primal-motorsports",
  displayName: "Matt · Primal Motorsports",
} as const;

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1]?.trim();
}

async function resolveClientId(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientSlug: string,
  clientIdArg?: string,
): Promise<number> {
  if (clientIdArg) {
    const id = Number.parseInt(clientIdArg, 10);
    if (!Number.isFinite(id)) {
      throw new Error(`Invalid --client-id: ${clientIdArg}`);
    }
    return id;
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "clients" as any,
    where: { slug: { equals: clientSlug } },
    limit: 1,
    overrideAccess: true,
  });

  if (result.docs.length === 0) {
    throw new Error(
      `Client "${clientSlug}" not found. Run npm run seed:clients or pass --client-id.`,
    );
  }

  return (result.docs[0] as { id: number }).id;
}

async function seedPortalUser() {
  const email = (readArg("--email") ?? DEFAULTS.email).toLowerCase();
  const password = readArg("--password") ?? DEFAULTS.password;
  const clientSlug = readArg("--client") ?? DEFAULTS.clientSlug;
  const clientIdArg = readArg("--client-id");
  const displayName = readArg("--display-name") ?? DEFAULTS.displayName;

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const payload = await getPayload({ config });
  const clientId = await resolveClientId(payload, clientSlug, clientIdArg);

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });

  let portalUserId: number;

  if (existing.docs.length > 0) {
    portalUserId = (existing.docs[0] as { id: number }).id;
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: portalUserId,
      data: {
        email,
        displayName,
        client: clientId,
        password,
      },
      overrideAccess: true,
    });
    console.log(`Updated portal user #${portalUserId} (${email})`);
  } else {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      data: {
        email,
        displayName,
        client: clientId,
        password,
      },
      overrideAccess: true,
    });
    portalUserId = created.id as number;
    console.log(`Created portal user #${portalUserId} (${email})`);
  }

  const login = await payload.login({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    data: { email, password },
  });

  if (!login.user?.id) {
    throw new Error("Password was saved but login verification failed.");
  }

  console.log("Login verification: OK");
  console.log(`Portal login: http://localhost:3000/portal/login`);
  console.log(`Email: ${email}`);
}

seedPortalUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
