import type { Payload } from "payload";
import { publishActivity } from "@/lib/activity-engine/publish";
import type { PublishActivityResult as EnginePublishResult } from "@/lib/activity-engine/types";
import type { ClientActivityInput, PublishActivityResult } from "./types";

/**
 * Canonical client activity publish — delegates to the Executive Activity Engine.
 * Kept for module-specific helpers and existing call sites.
 */
export async function publishClientActivity(
  input: ClientActivityInput,
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  const result: EnginePublishResult = await publishActivity(
    {
      clientId: input.clientId,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      description: input.details ?? input.summary,
      sourceModule: input.sourceModule,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      author: input.author,
      occurredAt: input.timestamp,
      status: input.status,
      importance: input.priority,
      metadata: input.metadata,
      relatedLinks: input.relatedLinks,
      attachments: input.attachments,
      projectId: input.projectId,
      requestId: input.requestId,
      infrastructureId: input.infrastructureId,
      deliverableId: input.deliverableId,
      internalOnly: input.internalOnly,
      pinned: input.pinned,
      dedupe: true,
    },
    payloadInstance,
  );

  return {
    created: result.created,
    skipped: result.skipped,
    id: result.id,
    dedupeKey: result.dedupeKey ?? `${String(input.sourceId)}:${input.eventType}`,
  };
}

export async function publishProjectActivity(
  params: {
    clientId: number;
    projectId: number;
    eventType: "project.created" | "project.launched" | "project.completed" | string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
    priority?: ClientActivityInput["priority"];
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Projects",
      sourceType: "client-project",
      sourceId: params.projectId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      projectId: params.projectId,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      priority: params.priority,
      relatedLinks: [
        {
          label: "Open project",
          href: `/admin/collections/client-projects/${params.projectId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishRequestActivity(
  params: {
    clientId: number;
    requestId: number;
    eventType: "request.opened" | "request.completed" | string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
    priority?: ClientActivityInput["priority"];
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Requests",
      sourceType: "client-request",
      sourceId: params.requestId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      requestId: params.requestId,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      priority: params.priority,
      relatedLinks: [
        {
          label: "Open request",
          href: `/admin/collections/client-requests/${params.requestId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishInvoiceActivity(
  params: {
    clientId: number;
    proposalId: number;
    eventType: "invoice.created" | "invoice.paid" | "proposal.created" | string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
    amount?: number | null;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Sales",
      sourceType: "proposal",
      sourceId: params.proposalId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      metadata: params.amount != null ? { amount: params.amount } : undefined,
      relatedLinks: [
        {
          label: "Open proposal",
          href: `/admin/sales/proposals/${params.proposalId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishRetainerActivity(
  params: {
    clientId: number;
    retainerId: number;
    eventType: "retainer.created" | "retainer.renewed" | string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
    monthlyAmount?: number | null;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Retainers",
      sourceType: "retainer",
      sourceId: params.retainerId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      metadata:
        params.monthlyAmount != null ? { monthlyAmount: params.monthlyAmount } : undefined,
      relatedLinks: [
        {
          label: "Open retainer",
          href: `/admin/collections/retainers/${params.retainerId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishNoteActivity(
  params: {
    clientId: number;
    noteId: number;
    eventType?: string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    pinned?: boolean;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Executive Notes",
      sourceType: "executive-note",
      sourceId: params.noteId,
      eventType: params.eventType ?? "note.created",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      pinned: params.pinned,
      relatedLinks: [
        {
          label: "Open note",
          href: `/admin/collections/executive-notes/${params.noteId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishMeetingActivity(
  params: {
    clientId: number;
    meetingId: number;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    satisfaction?: string | null;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Client Success",
      sourceType: "success-check-in",
      sourceId: params.meetingId,
      eventType: "meeting.logged",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      metadata: params.satisfaction ? { satisfaction: params.satisfaction } : undefined,
      relatedLinks: [
        {
          label: "Open check-in",
          href: `/admin/collections/success-check-ins/${params.meetingId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishInfrastructureActivity(
  params: {
    clientId: number;
    infrastructureId: number;
    eventType?: string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Infrastructure",
      sourceType: "client-infrastructure",
      sourceId: params.infrastructureId,
      eventType: params.eventType ?? "infrastructure.updated",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      infrastructureId: params.infrastructureId,
      relatedLinks: [
        {
          label: "Infrastructure registry",
          href: `/admin/operations/infrastructure/${params.clientId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishDeploymentActivity(
  params: {
    clientId: number;
    sourceId: string | number;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    infrastructureId?: number;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Infrastructure",
      sourceType: "deployment",
      sourceId: params.sourceId,
      eventType: "deployment.recorded",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      infrastructureId: params.infrastructureId,
      relatedLinks: [
        {
          label: "Infrastructure",
          href: `/admin/operations/infrastructure/${params.clientId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishEmailActivity(
  params: {
    clientId: number;
    sourceId: string | number;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Emails",
      sourceType: "email",
      sourceId: params.sourceId,
      eventType: "email.logged",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      relatedLinks: [
        {
          label: "Client workspace",
          href: `/admin/operations/client-command/${params.clientId}?tab=emails`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishWorkItemActivity(
  params: {
    clientId: number;
    taskId: number;
    eventType: "work.created" | "work.completed" | "work.blocked" | "work.status-changed" | string;
    title: string;
    summary?: string;
    status?: string;
    sourceType?: string;
    projectId?: number;
    requestId?: number;
    timestamp?: string;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Work",
      sourceType: "client-task",
      sourceId: params.taskId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      projectId: params.projectId,
      requestId: params.requestId,
      timestamp: params.timestamp,
      status: params.status,
      relatedLinks: [
        {
          label: "Open work item",
          href: `/admin/collections/client-tasks/${params.taskId}`,
        },
        {
          label: "Client work board",
          href: `/admin/operations/work/${params.clientId}`,
        },
      ],
      metadata: params.sourceType ? { workSourceType: params.sourceType } : undefined,
    },
    payloadInstance,
  );
}
