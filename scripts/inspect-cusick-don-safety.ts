/**
 * Read-only Don / invitation safety check for Cusick portfolio UX batch.
 * Does not activate, invite, email, or mutate anything.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { formatDbTarget, loadPayloadEnv, resolveDbTarget } from "./lib/payload-db-target";

const DON_EMAIL = "don.cusick@deezco.com";

type LooseDoc = {
  id?: number | string;
  email?: string | null;
  status?: string | null;
  active?: boolean | null;
  isActive?: boolean | null;
  sendCount?: number | null;
  sentAt?: string | null;
  role?: string | null;
  client?:
    | number
    | {
        id?: number | string;
        name?: string | null;
      }
    | null;
};

async function main() {
  loadPayloadEnv();
  const db = resolveDbTarget();
  console.log(`DB target: ${formatDbTarget(db)}`);

  const payload = await getPayload({ config });

  const users = await payload.find({
    collection: "portal-users",
    where: { email: { equals: DON_EMAIL } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  const inviteById = await payload.find({
    collection: "portal-invitations",
    where: { id: { equals: 3 } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const invitesByEmail = await payload.find({
    collection: "portal-invitations",
    where: { email: { equals: DON_EMAIL } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  const firstUser = users.docs[0] as LooseDoc | undefined;
  const memberships =
    firstUser?.id != null
      ? await payload.find({
          collection: "portal-client-memberships",
          where: { portalUser: { equals: Number(firstUser.id) } },
          limit: 20,
          depth: 1,
          overrideAccess: true,
        })
      : { docs: [] as LooseDoc[] };

  const report = {
    portalUsers: (users.docs as LooseDoc[]).map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status ?? null,
      active: row.active ?? null,
      isActive: row.isActive ?? null,
    })),
    invitation3: (inviteById.docs as LooseDoc[]).map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      sendCount: row.sendCount,
      sentAt: row.sentAt ?? null,
    })),
    invitationsForDon: (invitesByEmail.docs as LooseDoc[]).map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      sendCount: row.sendCount,
    })),
    memberships: (memberships.docs as LooseDoc[]).map((row) => {
      const client = row.client;
      return {
        id: row.id,
        status: row.status,
        role: row.role ?? null,
        clientId:
          typeof client === "object" && client != null ? client.id : client,
        clientName:
          typeof client === "object" && client != null ? client.name : null,
      };
    }),
  };

  console.log(JSON.stringify(report, null, 2));

  const invite3 = report.invitation3[0];
  const user = report.portalUsers[0];
  const ok =
    invite3 != null &&
    invite3.status === "draft" &&
    Number(invite3.sendCount) === 0 &&
    invite3.sentAt == null &&
    user != null &&
    user.active === false;

  console.log(ok ? "\nDON SAFETY: PASS" : "\nDON SAFETY: REVIEW REQUIRED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
