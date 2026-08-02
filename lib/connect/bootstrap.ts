/**
 * Phase 6 Batch C0 — idempotent KXD Connect organization bootstrap.
 *
 * Creates the initial KXD organization tenant only.
 * Does not grant staff/client memberships, conversations, or fixtures.
 * Must not run against production unless explicitly authorized later.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@/payload.config";
import { appendConnectAuditEvent } from "./audit";
import { CONNECT_KXD_ORGANIZATION_KEY } from "./types";

export type ConnectKxdBootstrapResult = {
  organizationId: number;
  key: string;
  created: boolean;
  updated: boolean;
};

export async function bootstrapKxdConnectOrganization(input?: {
  actorOperatorUserId?: number | null;
}): Promise<ConnectKxdBootstrapResult> {
  const payload = await getPayload({ config });

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-organizations" as any,
    where: { key: { equals: CONNECT_KXD_ORGANIZATION_KEY } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs.length > 0) {
    const doc = existing.docs[0] as { id: number; status?: string; name?: string };
    let updated = false;
    if (doc.status !== "active" || doc.name !== "Kreate by Design") {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "connect-organizations" as any,
        id: doc.id,
        data: {
          name: "Kreate by Design",
          status: "active",
        },
        overrideAccess: true,
      });
      updated = true;
      await appendConnectAuditEvent({
        type: "organization.activated",
        organizationId: Number(doc.id),
        actorKind: "system",
        actorOperatorUserId: input?.actorOperatorUserId ?? null,
        summary: "KXD Connect organization bootstrap ensured active state.",
        metadata: { key: CONNECT_KXD_ORGANIZATION_KEY },
      });
    }
    return {
      organizationId: Number(doc.id),
      key: CONNECT_KXD_ORGANIZATION_KEY,
      created: false,
      updated,
    };
  }

  const created = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "connect-organizations" as any,
    data: {
      key: CONNECT_KXD_ORGANIZATION_KEY,
      name: "Kreate by Design",
      status: "active",
      config: {
        brandingHooksReserved: true,
      },
    },
    overrideAccess: true,
  });

  const organizationId = Number((created as { id: number }).id);
  await appendConnectAuditEvent({
    type: "organization.created",
    organizationId,
    actorKind: "system",
    actorOperatorUserId: input?.actorOperatorUserId ?? null,
    summary: "KXD Connect organization created by bootstrap.",
    metadata: { key: CONNECT_KXD_ORGANIZATION_KEY },
  });

  return {
    organizationId,
    key: CONNECT_KXD_ORGANIZATION_KEY,
    created: true,
    updated: false,
  };
}
