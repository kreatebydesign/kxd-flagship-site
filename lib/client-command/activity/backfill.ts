import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { CommandDoc } from "../types";
import type { ActivityBackfillResult } from "./types";
import {
  publishInfrastructureActivity,
  publishInvoiceActivity,
  publishMeetingActivity,
  publishNoteActivity,
  publishProjectActivity,
  publishRequestActivity,
  publishRetainerActivity,
} from "./publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/**
 * Idempotent scan of existing client records — creates missing timeline activity.
 */
export async function backfillClientActivity(options?: {
  clientId?: number;
  limit?: number;
}): Promise<ActivityBackfillResult> {
  const payload = await getPayload({ config });
  const limit = options?.limit ?? 500;
  const result: ActivityBackfillResult = {
    created: 0,
    skipped: 0,
    errors: [],
    clientsProcessed: 0,
  };

  const clientsR = await payload.find({
    collection: "clients",
    where: options?.clientId ? { id: { equals: options.clientId } } : undefined,
    limit,
    depth: 0,
    overrideAccess: true,
  });

  const clients = clientsR.docs as AnyDoc[];

  for (const client of clients) {
    const clientId = client.id as number;
    result.clientsProcessed++;

    try {
      const [
        projectsR,
        requestsR,
        proposalsR,
        retainersR,
        notesR,
        meetingsR,
        infraR,
      ] = await Promise.all([
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "client-projects" as any,
          where: { client: { equals: clientId } },
          limit: 200,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "client-requests" as any,
          where: { client: { equals: clientId } },
          limit: 200,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "proposals" as any,
          where: { client: { equals: clientId } },
          limit: 200,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "retainers" as any,
          where: { client: { equals: clientId } },
          limit: 100,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "executive-notes" as any,
          where: { client: { equals: clientId } },
          limit: 200,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "success-check-ins" as any,
          where: { client: { equals: clientId } },
          limit: 200,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "client-infrastructure" as any,
          where: { client: { equals: clientId } },
          limit: 5,
          depth: 0,
          overrideAccess: true,
        }),
      ]);

      for (const project of projectsR.docs as AnyDoc[]) {
        const projectId = project.id as number;
        const name = String(project.projectName ?? "Project");

        const created = await publishProjectActivity(
          {
            clientId,
            projectId,
            eventType: "project.created",
            title: `Project opened · ${name}`,
            summary: `Project created with status ${String(project.status ?? "planning")}.`,
            timestamp: project.createdAt ? String(project.createdAt) : undefined,
            status: String(project.status ?? "open"),
          },
          payload,
        );
        if (created.created) result.created++;
        else result.skipped++;

        if (String(project.status) === "launched") {
          const launched = await publishProjectActivity(
            {
              clientId,
              projectId,
              eventType: "project.launched",
              title: `Project launched · ${name}`,
              summary: project.liveUrl ? `Live at ${String(project.liveUrl)}` : "Project marked launched.",
              timestamp:
                (project.updatedAt as string) || (project.createdAt as string) || undefined,
              status: "completed",
            },
            payload,
          );
          if (launched.created) result.created++;
          else result.skipped++;
        }
      }

      for (const request of requestsR.docs as AnyDoc[]) {
        const requestId = request.id as number;
        const title = String(request.requestTitle ?? "Request");

        const opened = await publishRequestActivity(
          {
            clientId,
            requestId,
            eventType: "request.opened",
            title: `Request opened · ${title}`,
            summary: request.requestDetails ? String(request.requestDetails).slice(0, 240) : undefined,
            timestamp: request.createdAt ? String(request.createdAt) : undefined,
            status: String(request.status ?? "open"),
            priority: request.priority as AnyDoc["priority"],
          },
          payload,
        );
        if (opened.created) result.created++;
        else result.skipped++;

        if (String(request.status) === "complete") {
          const completed = await publishRequestActivity(
            {
              clientId,
              requestId,
              eventType: "request.completed",
              title: `Request completed · ${title}`,
              summary: "Client request marked complete.",
              timestamp:
                (request.completedDate as string) ||
                (request.updatedAt as string) ||
                undefined,
              status: "completed",
            },
            payload,
          );
          if (completed.created) result.created++;
          else result.skipped++;
        }
      }

      for (const proposal of proposalsR.docs as AnyDoc[]) {
        const proposalId = proposal.id as number;
        const label = String(proposal.title ?? proposal.proposalNumber ?? proposalId);

        const created = await publishInvoiceActivity(
          {
            clientId,
            proposalId,
            eventType: "proposal.created",
            title: `Proposal created · ${label}`,
            summary: `Status: ${String(proposal.status ?? "draft")}.`,
            timestamp: proposal.createdAt ? String(proposal.createdAt) : undefined,
            status: String(proposal.status ?? "open"),
            amount:
              proposal.investment != null
                ? Number(proposal.investment)
                : proposal.recurringAmount != null
                  ? Number(proposal.recurringAmount)
                  : null,
          },
          payload,
        );
        if (created.created) result.created++;
        else result.skipped++;

        const paymentStatus = String(proposal.paymentStatus ?? "");
        if (paymentStatus === "paid" || paymentStatus === "deposit-paid") {
          const paid = await publishInvoiceActivity(
            {
              clientId,
              proposalId,
              eventType: "invoice.paid",
              title: `Payment received · ${label}`,
              summary: `Payment status: ${paymentStatus}.`,
              timestamp:
                (proposal.paymentDate as string) || (proposal.updatedAt as string) || undefined,
              status: "completed",
              amount:
                proposal.paidAmount != null
                  ? Number(proposal.paidAmount)
                  : proposal.investment != null
                    ? Number(proposal.investment)
                    : null,
            },
            payload,
          );
          if (paid.created) result.created++;
          else result.skipped++;
        }
      }

      for (const retainer of retainersR.docs as AnyDoc[]) {
        const retainerId = retainer.id as number;
        const name = String(retainer.retainerName ?? "Retainer");

        const created = await publishRetainerActivity(
          {
            clientId,
            retainerId,
            eventType: "retainer.created",
            title: `Retainer started · ${name}`,
            summary:
              retainer.monthlyAmount != null
                ? `$${Number(retainer.monthlyAmount).toLocaleString()} / month`
                : undefined,
            timestamp: retainer.createdAt ? String(retainer.createdAt) : undefined,
            status: String(retainer.billingStatus ?? "active"),
            monthlyAmount:
              retainer.monthlyAmount != null ? Number(retainer.monthlyAmount) : null,
          },
          payload,
        );
        if (created.created) result.created++;
        else result.skipped++;

        if (retainer.renewalDate) {
          const renewed = await publishRetainerActivity(
            {
              clientId,
              retainerId,
              eventType: "retainer.renewed",
              title: `Retainer renewal · ${name}`,
              summary: `Renewal date ${String(retainer.renewalDate)}.`,
              timestamp: String(retainer.renewalDate),
              status: "active",
              monthlyAmount:
                retainer.monthlyAmount != null ? Number(retainer.monthlyAmount) : null,
            },
            payload,
          );
          if (renewed.created) result.created++;
          else result.skipped++;
        }
      }

      for (const note of notesR.docs as AnyDoc[]) {
        const noteId = note.id as number;
        const published = await publishNoteActivity(
          {
            clientId,
            noteId,
            title: `Note added · ${String(note.title ?? "Note")}`,
            summary: note.summary ? String(note.summary) : undefined,
            author: note.author ? String(note.author) : undefined,
            timestamp: note.createdAt ? String(note.createdAt) : undefined,
            pinned: Boolean(note.pinned),
          },
          payload,
        );
        if (published.created) result.created++;
        else result.skipped++;
      }

      for (const meeting of meetingsR.docs as AnyDoc[]) {
        const meetingId = meeting.id as number;
        const published = await publishMeetingActivity(
          {
            clientId,
            meetingId,
            title: `Meeting logged · ${String(meeting.summary ?? "Check-in").slice(0, 80)}`,
            summary: meeting.summary ? String(meeting.summary) : undefined,
            timestamp:
              (meeting.meetingDate as string) || (meeting.createdAt as string) || undefined,
            satisfaction: meeting.satisfaction ? String(meeting.satisfaction) : null,
          },
          payload,
        );
        if (published.created) result.created++;
        else result.skipped++;
      }

      for (const infra of infraR.docs as AnyDoc[]) {
        const infraId = infra.id as number;
        const published = await publishInfrastructureActivity(
          {
            clientId,
            infrastructureId: infraId,
            title: `Infrastructure updated · ${String(infra.primaryDomain ?? "registry")}`,
            summary: `Status ${String(infra.status ?? "active")}. Score ${String(
              infra.infrastructureScore ?? "—",
            )}.`,
            timestamp: infra.updatedAt ? String(infra.updatedAt) : undefined,
            status: String(infra.status ?? "active"),
          },
          payload,
        );
        if (published.created) result.created++;
        else result.skipped++;
      }
    } catch (err) {
      result.errors.push(
        `Client ${clientId}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  return result;
}
