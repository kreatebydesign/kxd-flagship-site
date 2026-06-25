import type { Payload } from "payload";
import type { ClientLaunchDraft, ClientLaunchResult } from "./types";
import { appendImportedRawNotes } from "./append-imported-raw-notes";
import { launchClientWorkflow } from "./launch-client-workflow";
import { prepareLaunchRecords } from "./prepare-launch-records";
import { slugifyBusinessName } from "./slug";

export interface ClientImportResult extends ClientLaunchResult {
  mode: "created" | "updated";
}

export type ImportWorkflowOptions = {
  rawNotes?: string;
};

async function findExistingClient(payload: Payload, businessName: string) {
  const slug = slugifyBusinessName(businessName);
  const bySlug = await payload.find({
    collection: "clients",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  if (bySlug.docs[0]) return bySlug.docs[0];

  const byName = await payload.find({
    collection: "clients",
    where: { name: { equals: businessName.trim() } },
    limit: 1,
  });
  return byName.docs[0] ?? null;
}

async function findExecutiveProfile(payload: Payload, clientId: number) {
  const result = await payload.find({
    collection: "executive-client-profiles",
    where: { client: { equals: clientId } },
    limit: 1,
  });
  return result.docs[0] ?? null;
}

async function findMatchingRetainer(
  payload: Payload,
  clientId: number,
  monthlyAmount: number,
) {
  const result = await payload.find({
    collection: "retainers",
    where: {
      client: { equals: clientId },
      monthlyAmount: { equals: monthlyAmount },
    },
    limit: 10,
  });
  return result.docs.find(
    (r) =>
      r.billingStatus === "active" ||
      r.billingStatus === "upcoming" ||
      r.billingStatus === "current",
  );
}

async function createImportTimelineEvent(
  payload: Payload,
  clientId: number,
  createdBy: string,
) {
  return payload.create({
    collection: "client-timeline-events",
    data: {
      client: clientId,
      eventType: "client-milestone",
      title: "Client imported into KXD OS",
      summary: "Client record imported via KXD Client Import utility.",
      eventDate: new Date().toISOString(),
      createdBy: createdBy || "KXD Client Import",
      source: "client-import",
    },
  });
}

export async function importClientWorkflow(
  payload: Payload,
  draft: ClientLaunchDraft,
  createdBy: string,
  options?: ImportWorkflowOptions,
): Promise<ClientImportResult> {
  const prepared = prepareLaunchRecords(draft);
  const profileData = {
    ...prepared.profileData,
    strategicNotes: appendImportedRawNotes(
      prepared.profileData.strategicNotes as string | undefined,
      options?.rawNotes,
    ),
  };

  if (!prepared.businessName) {
    throw new Error("Business name is required.");
  }

  const existing = await findExistingClient(payload, prepared.businessName);

  if (!existing) {
    const result = await launchClientWorkflow(payload, draft, createdBy, {
      timeline: {
        eventType: "client-milestone",
        title: "Client imported into KXD OS",
        summary: "Client record imported via KXD Client Import utility.",
        source: "client-import",
      },
      rawNotes: options?.rawNotes,
    });
    return { ...result, mode: "created" };
  }

  const clientId = existing.id as number;

  await payload.update({
    collection: "clients",
    id: clientId,
    data: prepared.clientData,
  });

  const existingProfile = await findExecutiveProfile(payload, clientId);
  let executiveProfileId: number;

  if (existingProfile) {
    const updated = await payload.update({
      collection: "executive-client-profiles",
      id: existingProfile.id as number,
      data: profileData,
    });
    executiveProfileId = updated.id as number;
  } else {
    const created = await payload.create({
      collection: "executive-client-profiles",
      data: {
        client: clientId,
        ...profileData,
      },
    });
    executiveProfileId = created.id as number;
  }

  let retainerId: number | null = null;
  if (prepared.retainerData && prepared.monthlyRetainer) {
    const matching = await findMatchingRetainer(
      payload,
      clientId,
      prepared.monthlyRetainer,
    );
    if (!matching) {
      const retainer = await payload.create({
        collection: "retainers",
        data: {
          ...prepared.retainerData,
          client: clientId,
        },
      });
      retainerId = retainer.id as number;
    } else {
      retainerId = matching.id as number;
    }
  }

  const timelineEvent = await createImportTimelineEvent(payload, clientId, createdBy);

  return {
    success: true,
    mode: "updated",
    clientId,
    clientName: prepared.businessName,
    workspaceUrl: `/admin/operations/clients/${clientId}`,
    executiveProfileId,
    retainerId,
    timelineEventId: timelineEvent.id as number,
  };
}
