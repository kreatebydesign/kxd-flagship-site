/**
 * Read-only: Cusick membership matrix + Billy safety.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { formatDbTarget, loadPayloadEnv, resolveDbTarget } from "./lib/payload-db-target";

async function main() {
  loadPayloadEnv();
  console.log(`DB target: ${formatDbTarget(resolveDbTarget())}`);
  const payload = await getPayload({ config });

  const memberships = await payload.find({
    collection: "portal-client-memberships",
    where: { client: { in: [5, 9, 14, 10] }, status: { equals: "active" } },
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });

  const rows = memberships.docs.map((m) => {
    const row = m as {
      id: number;
      status?: string;
      client?: number | { id?: number; name?: string };
      portalUser?: number | { id?: number; email?: string; active?: boolean };
    };
    const client = row.client;
    const user = row.portalUser;
    return {
      id: row.id,
      status: row.status,
      clientId: typeof client === "object" ? client?.id : client,
      clientName: typeof client === "object" ? client?.name : null,
      userId: typeof user === "object" ? user?.id : user,
      userEmail: typeof user === "object" ? user?.email : null,
      userActive: typeof user === "object" ? user?.active : null,
    };
  });

  const billyUsers = await payload.find({
    collection: "portal-users",
    where: { email: { equals: "billy.morgan@cusickmotorsports.com" } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });
  const billyInvites = await payload.find({
    collection: "portal-invitations",
    where: { email: { equals: "billy.morgan@cusickmotorsports.com" } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });

  console.log(
    JSON.stringify(
      {
        memberships: rows,
        billyUsers: billyUsers.docs.map((u) => {
          const row = u as { id: number; email?: string; active?: boolean };
          return { id: row.id, email: row.email, active: row.active };
        }),
        billyInvites: billyInvites.docs.map((i) => {
          const row = i as {
            id: number;
            status?: string;
            sendCount?: number;
            sentAt?: string | null;
          };
          return {
            id: row.id,
            status: row.status,
            sendCount: row.sendCount,
            sentAt: row.sentAt ?? null,
          };
        }),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
