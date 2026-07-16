/**
 * Phase 35 — sample Client Provisioning Engine verification.
 * Creates then deletes a temporary client. Does not leave production residue.
 *
 * Run:
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --import ./scripts/shims/register-server-only.mjs scripts/verify-client-provisioning.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";
import { emptyProvisioningPayload } from "../lib/client-provisioning/empty";
import { orchestrateClientProvision } from "../lib/client-provisioning/orchestrate";
import { resolveModulesForPackage } from "../lib/client-provisioning/packages/resolve";

async function main() {
  const payload = await getPayload({ config });
  const stamp = Date.now().toString(36);
  const slug = `kxd-provision-qa-${stamp}`;

  const draft = emptyProvisioningPayload();
  draft.identity = {
    companyName: `KXD Provision QA ${stamp}`,
    companySlug: slug,
    companyWebsite: "https://example.com",
    previewWebsite: "",
    primaryContact: "QA Operator",
    email: `provision-qa-${stamp}@kreatebydesign.com`,
    phone: "",
    address: "",
    industry: "QA",
    clientStatus: "prospect",
  };
  draft.packageId = "starter";
  draft.modules = resolveModulesForPackage("starter");
  draft.portalSeats = [
    {
      displayName: "QA Owner",
      email: `provision-qa-${stamp}@kreatebydesign.com`,
      role: "owner",
      sendInvite: false,
    },
  ];
  draft.automation.reportingSchedule = false;

  const result = await orchestrateClientProvision({
    payload,
    draft,
    createdBy: "verify-client-provisioning.ts",
    skipPreviewHealth: true,
  });

  if (!result.success) {
    console.error(JSON.stringify(result, null, 2));
    throw new Error(result.failureSummary);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        clientId: result.clientId,
        clientSlug: result.clientSlug,
        entitlements: result.entitlementsPersisted,
        portalUsers: result.portalUsersCreated,
        logTail: result.log.slice(-5),
      },
      null,
      2,
    ),
  );

  // Cleanup sample client (compensating delete of children first).
  const clientId = result.clientId;
  const portal = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { client: { equals: clientId } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  for (const doc of portal.docs as Array<{ id: number | string }>) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: doc.id,
      overrideAccess: true,
    });
  }

  for (const collection of [
    "client-timeline-events",
    "client-infrastructure",
    "client-experience-profiles",
    "executive-client-profiles",
  ] as const) {
    const found = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collection as any,
      where: { client: { equals: clientId } },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    });
    for (const doc of found.docs as Array<{ id: number | string }>) {
      await payload.delete({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: collection as any,
        id: doc.id,
        overrideAccess: true,
      });
    }
  }

  const execEvents = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { eventType: { equals: "client.provisioned" } },
      ],
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  for (const doc of execEvents.docs as Array<{ id: number | string }>) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-timeline-events" as any,
      id: doc.id,
      overrideAccess: true,
    });
  }

  await payload.delete({
    collection: "clients",
    id: clientId,
    overrideAccess: true,
  });

  console.log("OK — sample client provisioned and cleaned up.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
