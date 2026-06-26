import type { Payload } from "payload";
import type { ClientLaunchDraft, ClientLaunchResult } from "./types";
import { appendImportedRawNotes } from "./append-imported-raw-notes";
import { publishers } from "@/lib/automation/publishers";
import { prepareLaunchRecords } from "./prepare-launch-records";
import { slugifyBusinessName } from "./slug";

export type LaunchWorkflowOptions = {
  timeline?: {
    eventType: "client-launch" | "client-milestone";
    title: string;
    summary: string;
    source: string;
  };
  rawNotes?: string;
};

async function uniqueSlug(payload: Payload, base: string): Promise<string> {
  let slug = base || "new-client";
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await payload.find({
      collection: "clients",
      where: { slug: { equals: candidate } },
      limit: 1,
    });
    if (existing.docs.length === 0) return candidate;
    suffix += 1;
  }
}

export async function launchClientWorkflow(
  payload: Payload,
  draft: ClientLaunchDraft,
  createdBy: string,
  options?: LaunchWorkflowOptions,
): Promise<ClientLaunchResult> {
  const prepared = prepareLaunchRecords(draft);

  if (!prepared.businessName) {
    throw new Error("Business name is required.");
  }

  const baseSlug = slugifyBusinessName(prepared.businessName);
  const slug = await uniqueSlug(payload, baseSlug);

  const client = await payload.create({
    collection: "clients",
    data: {
      ...prepared.clientData,
      slug,
    },
  });

  const clientId = client.id as number;

  const profile = await payload.create({
    collection: "executive-client-profiles",
    data: {
      client: clientId,
      ...prepared.profileData,
      strategicNotes: appendImportedRawNotes(
        prepared.profileData.strategicNotes as string | undefined,
        options?.rawNotes,
      ),
    },
  });

  let retainerId: number | null = null;
  if (prepared.retainerData) {
    const retainer = await payload.create({
      collection: "retainers",
      data: {
        ...prepared.retainerData,
        client: clientId,
      },
    });
    retainerId = retainer.id as number;
  }

  const timeline = options?.timeline ?? {
    eventType: "client-launch" as const,
    title: "Client launched into KXD OS",
    summary: "Partnership launched via KXD Client Launch workflow.",
    source: "client-launch",
  };

  const timelineEvent = await payload.create({
    collection: "client-timeline-events",
    data: {
      client: clientId,
      eventType: timeline.eventType,
      title: timeline.title,
      summary: timeline.summary,
      eventDate: new Date().toISOString(),
      createdBy: createdBy || "KXD Client Launch",
      source: timeline.source,
    },
  });

  try {
    await publishers.launch.clientLaunched(
      {
        clientId,
        title: timeline.title,
        summary: timeline.summary,
        eventType: timeline.eventType,
        createdBy: createdBy || "KXD Client Launch",
        source: timeline.source,
      },
      payload,
    );
  } catch (err) {
    console.error("[KXD Launch] Automation publish failed:", err);
  }

  return {
    success: true,
    clientId,
    clientName: prepared.businessName,
    workspaceUrl: `/admin/operations/clients/${clientId}`,
    executiveProfileId: profile.id as number,
    retainerId,
    timelineEventId: timelineEvent.id as number,
  };
}
