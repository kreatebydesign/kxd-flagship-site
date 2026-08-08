/**
 * Read-only OTP Carts portal access inspection.
 *
 * Default: dry report against the active Payload DB target (never creates users,
 * memberships, invitations, or sends email).
 *
 * Usage:
 *   npx tsx scripts/inspect-otp-carts-portal-access.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPayloadEnv, resolveDbTarget } from "./lib/payload-db-target";
import { normalizePortalEmail } from "../lib/portal/identity/crypto";
import { listPortalInvitations } from "../lib/portal/identity/invitations";
import { listPortalMembershipsForUser } from "../lib/portal/memberships";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as AnyDoc).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\nOTP Carts portal access inspection (read-only)\n");
  console.log(
    `DB target: kind=${target.kind} host=${target.host} db=${target.database} via=${target.sourceVar}`,
  );

  if (target.kind === "sqlite" || target.kind === "missing") {
    console.log(
      "\nNo Postgres target resolved — cannot inspect portal memberships.\n",
    );
    process.exitCode = 2;
    return;
  }

  const payload = await getPayload({ config });

  const clients = await payload.find({
    collection: "clients",
    where: { slug: { equals: "otp-carts" } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });

  if (clients.docs.length === 0) {
    console.log("Client slug=otp-carts not found.");
    process.exitCode = 2;
    return;
  }

  const client = clients.docs[0] as AnyDoc;
  const clientId = Number(client.id);
  const primaryEmailRaw =
    client.primaryContactEmail ||
    client.email ||
    client.primaryEmail ||
    null;
  const contactName =
    client.primaryContactName ||
    client.contactName ||
    client.ownerName ||
    "Don Cusick";

  // Prefer executive profile contact if present
  let profileEmail: string | null = null;
  let profileContact: string | null = null;
  try {
    const profiles = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-client-profiles" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const profile = profiles.docs[0] as AnyDoc | undefined;
    if (profile) {
      profileEmail =
        typeof profile.primaryContactEmail === "string"
          ? profile.primaryContactEmail
          : typeof profile.email === "string"
            ? profile.email
            : null;
      profileContact =
        typeof profile.primaryContactName === "string"
          ? profile.primaryContactName
          : typeof profile.primaryContact === "string"
            ? profile.primaryContact
            : null;
    }
  } catch {
    /* collection may vary */
  }

  const candidateEmail = normalizePortalEmail(
    String(profileEmail || primaryEmailRaw || ""),
  );

  console.log("Client:");
  console.log(`  id: ${clientId}`);
  console.log(`  name: ${client.name}`);
  console.log(`  slug: ${client.slug}`);
  console.log(`  contact candidate: ${profileContact || contactName}`);
  console.log(`  email candidate: ${candidateEmail || "(missing)"}`);

  // Portal users by email
  let portalUser: AnyDoc | null = null;
  if (candidateEmail) {
    const users = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      where: { email: { equals: candidateEmail } },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    });
    portalUser = (users.docs[0] as AnyDoc) ?? null;
  }

  // Memberships for this client
  const memberships = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-client-memberships" as any,
    where: { client: { equals: clientId } },
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });

  console.log("\nPortal users / memberships:");
  if (portalUser) {
    console.log(
      `  portal-user: id=${portalUser.id} email=${portalUser.email} active=${portalUser.active !== false}`,
    );
    const userMemberships = await listPortalMembershipsForUser(
      Number(portalUser.id),
      { payload },
    );
    for (const m of userMemberships) {
      console.log(
        `    membership client=${m.clientId} (${m.clientName}) role=${m.role} status=${m.status}`,
      );
    }
  } else {
    console.log("  portal-user for candidate email: none");
  }

  console.log(`  memberships on otp-carts client: ${memberships.docs.length}`);
  for (const doc of memberships.docs) {
    const d = doc as AnyDoc;
    const userId = relId(d.portalUser ?? d.user);
    const email =
      typeof d.portalUser === "object" && d.portalUser
        ? String((d.portalUser as AnyDoc).email ?? "")
        : "";
    console.log(
      `    membership id=${d.id} user=${userId} email=${email || "?"} role=${d.role} status=${d.status}`,
    );
  }

  const invitations = await listPortalInvitations(payload);
  const otpInvites = invitations.filter((inv) =>
    inv.memberships.some((m) => m.clientId === clientId),
  );
  console.log(`\nInvitations touching otp-carts: ${otpInvites.length}`);
  for (const inv of otpInvites) {
    console.log(
      `  invite id=${inv.id} email=${inv.email} status=${inv.status} sendCount=${inv.sendCount} expiresAt=${inv.expiresAt}`,
    );
  }

  const hasActiveMembership = memberships.docs.some((doc) => {
    const d = doc as AnyDoc;
    return d.status === "active" || d.status == null;
  });

  console.log("\nProvisioning readiness:");
  if (hasActiveMembership) {
    console.log("  STATE: membership already exists — no invite required for access.");
    console.log("  ACTION: use Portal Access to confirm Don can log in / reset password if needed.");
  } else if (!candidateEmail) {
    console.log("  STATE: no email on client/profile — cannot prepare invitation.");
    console.log("  ACTION: set Don's email on the client record first.");
  } else if (otpInvites.some((i) => i.status === "draft" || i.status === "sent")) {
    console.log("  STATE: invitation draft/sent already exists.");
    console.log("  ACTION: review in Portal Access; send only when authorized.");
  } else {
    console.log("  STATE: no active membership — ready to prepare invitation draft.");
    console.log("  PREFERRED FLOW (do not auto-run):");
    console.log("    POST /api/admin/portal-invitations");
    console.log(
      `    { email: "${candidateEmail}", displayName: "${profileContact || contactName}", memberships: [{ clientId: ${clientId}, role: "client-owner" }], sendNow: false }`,
    );
    console.log("  Then send via Portal Access when authorized (no password invention).");
  }

  console.log("\nNo users, memberships, or invites were created by this script.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
