import type { CollectionAfterChangeHook } from "payload";
import {
  publishInfrastructureActivity,
  publishInvoiceActivity,
  publishMeetingActivity,
  publishNoteActivity,
  publishProjectActivity,
  publishRequestActivity,
  publishRetainerActivity,
} from "@/lib/client-command/activity/publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as AnyDoc).id);
  }
  return null;
}

export const publishProjectActivityHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const clientId = relId(doc.client);
  if (!clientId) return doc;

  const projectId = doc.id as number;
  const name = String(doc.projectName ?? "Project");

  try {
    if (operation === "create") {
      await publishProjectActivity(
        {
          clientId,
          projectId,
          eventType: "project.created",
          title: `Project opened · ${name}`,
          summary: `Status: ${String(doc.status ?? "planning")}.`,
          timestamp: doc.createdAt ? String(doc.createdAt) : undefined,
          status: String(doc.status ?? "open"),
        },
        req.payload,
      );
    }

    const status = String(doc.status ?? "");
    const previousStatus = String((previousDoc as AnyDoc | undefined)?.status ?? "");
    if (status === "launched" && previousStatus !== "launched") {
      await publishProjectActivity(
        {
          clientId,
          projectId,
          eventType: "project.launched",
          title: `Project launched · ${name}`,
          summary: doc.liveUrl ? `Live at ${String(doc.liveUrl)}` : "Project marked launched.",
          timestamp: doc.updatedAt ? String(doc.updatedAt) : undefined,
          status: "completed",
        },
        req.payload,
      );
    }
  } catch (err) {
    console.error("[KXD Activity] project hook failed:", err);
  }

  return doc;
};

export const publishRequestActivityHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const clientId = relId(doc.client);
  if (!clientId) return doc;

  const requestId = doc.id as number;
  const title = String(doc.requestTitle ?? "Request");

  try {
    if (operation === "create") {
      await publishRequestActivity(
        {
          clientId,
          requestId,
          eventType: "request.opened",
          title: `Request opened · ${title}`,
          summary: doc.requestDetails ? String(doc.requestDetails).slice(0, 240) : undefined,
          timestamp: doc.createdAt ? String(doc.createdAt) : undefined,
          status: String(doc.status ?? "open"),
          priority: doc.priority as AnyDoc["priority"],
        },
        req.payload,
      );
    }

    const status = String(doc.status ?? "");
    const previousStatus = String((previousDoc as AnyDoc | undefined)?.status ?? "");
    if (status === "complete" && previousStatus !== "complete") {
      await publishRequestActivity(
        {
          clientId,
          requestId,
          eventType: "request.completed",
          title: `Request completed · ${title}`,
          summary: "Client request marked complete.",
          timestamp:
            (doc.completedDate as string) || (doc.updatedAt as string) || undefined,
          status: "completed",
        },
        req.payload,
      );
    }
  } catch (err) {
    console.error("[KXD Activity] request hook failed:", err);
  }

  return doc;
};

export const publishProposalActivityHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const clientId = relId(doc.client);
  if (!clientId) return doc;

  const proposalId = doc.id as number;
  const label = String(doc.title ?? doc.proposalNumber ?? proposalId);

  try {
    if (operation === "create") {
      await publishInvoiceActivity(
        {
          clientId,
          proposalId,
          eventType: "proposal.created",
          title: `Proposal created · ${label}`,
          summary: `Status: ${String(doc.status ?? "draft")}.`,
          timestamp: doc.createdAt ? String(doc.createdAt) : undefined,
          status: String(doc.status ?? "open"),
          amount:
            doc.investment != null
              ? Number(doc.investment)
              : doc.recurringAmount != null
                ? Number(doc.recurringAmount)
                : null,
        },
        req.payload,
      );
    }

    const paymentStatus = String(doc.paymentStatus ?? "");
    const previousPayment = String((previousDoc as AnyDoc | undefined)?.paymentStatus ?? "");
    if (
      (paymentStatus === "paid" || paymentStatus === "deposit-paid") &&
      previousPayment !== paymentStatus
    ) {
      await publishInvoiceActivity(
        {
          clientId,
          proposalId,
          eventType: "invoice.paid",
          title: `Payment received · ${label}`,
          summary: `Payment status: ${paymentStatus}.`,
          timestamp:
            (doc.paymentDate as string) || (doc.updatedAt as string) || undefined,
          status: "completed",
          amount:
            doc.paidAmount != null
              ? Number(doc.paidAmount)
              : doc.investment != null
                ? Number(doc.investment)
                : null,
        },
        req.payload,
      );
    }
  } catch (err) {
    console.error("[KXD Activity] proposal hook failed:", err);
  }

  return doc;
};

export const publishRetainerActivityHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const clientId = relId(doc.client);
  if (!clientId) return doc;

  const retainerId = doc.id as number;
  const name = String(doc.retainerName ?? "Retainer");

  try {
    if (operation === "create") {
      await publishRetainerActivity(
        {
          clientId,
          retainerId,
          eventType: "retainer.created",
          title: `Retainer started · ${name}`,
          summary:
            doc.monthlyAmount != null
              ? `$${Number(doc.monthlyAmount).toLocaleString()} / month`
              : undefined,
          timestamp: doc.createdAt ? String(doc.createdAt) : undefined,
          status: String(doc.billingStatus ?? "active"),
          monthlyAmount: doc.monthlyAmount != null ? Number(doc.monthlyAmount) : null,
        },
        req.payload,
      );
    }

    const renewalDate = doc.renewalDate ? String(doc.renewalDate) : "";
    const previousRenewal = (previousDoc as AnyDoc | undefined)?.renewalDate
      ? String((previousDoc as AnyDoc).renewalDate)
      : "";
    if (renewalDate && renewalDate !== previousRenewal) {
      await publishRetainerActivity(
        {
          clientId,
          retainerId,
          eventType: "retainer.renewed",
          title: `Retainer renewal · ${name}`,
          summary: `Renewal date ${renewalDate}.`,
          timestamp: renewalDate,
          status: "active",
          monthlyAmount: doc.monthlyAmount != null ? Number(doc.monthlyAmount) : null,
        },
        req.payload,
      );
    }
  } catch (err) {
    console.error("[KXD Activity] retainer hook failed:", err);
  }

  return doc;
};

export const publishNoteActivityHook: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;

  const clientId = relId(doc.client);
  if (!clientId) return doc;

  try {
    await publishNoteActivity(
      {
        clientId,
        noteId: doc.id as number,
        title: `Note added · ${String(doc.title ?? "Note")}`,
        summary: doc.summary ? String(doc.summary) : undefined,
        author: doc.author ? String(doc.author) : undefined,
        timestamp: doc.createdAt ? String(doc.createdAt) : undefined,
        pinned: Boolean(doc.pinned),
      },
      req.payload,
    );
  } catch (err) {
    console.error("[KXD Activity] note hook failed:", err);
  }

  return doc;
};

export const publishMeetingActivityHook: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;

  const clientId = relId(doc.client);
  if (!clientId) return doc;

  try {
    await publishMeetingActivity(
      {
        clientId,
        meetingId: doc.id as number,
        title: `Meeting logged · ${String(doc.summary ?? "Check-in").slice(0, 80)}`,
        summary: doc.summary ? String(doc.summary) : undefined,
        timestamp:
          (doc.meetingDate as string) || (doc.createdAt as string) || undefined,
        satisfaction: doc.satisfaction ? String(doc.satisfaction) : null,
      },
      req.payload,
    );
  } catch (err) {
    console.error("[KXD Activity] meeting hook failed:", err);
  }

  return doc;
};

export const publishInfrastructureActivityHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const clientId = relId(doc.client);
  if (!clientId) return doc;

  if (operation === "create" && !previousDoc) {
    try {
      await publishInfrastructureActivity(
        {
          clientId,
          infrastructureId: doc.id as number,
          eventType: "infrastructure.created",
          title: `Infrastructure registry created · ${String(doc.primaryDomain ?? "domain")}`,
          summary: "Client infrastructure record initialized.",
          timestamp: doc.createdAt ? String(doc.createdAt) : undefined,
          status: String(doc.status ?? "active"),
        },
        req.payload,
      );
    } catch (err) {
      console.error("[KXD Activity] infrastructure create hook failed:", err);
    }
    return doc;
  }

  if (operation !== "update") return doc;

  try {
    await publishInfrastructureActivity(
      {
        clientId,
        infrastructureId: doc.id as number,
        eventType: "infrastructure.updated",
        title: `Infrastructure updated · ${String(doc.primaryDomain ?? "registry")}`,
        summary: `Status ${String(doc.status ?? "active")}. Score ${String(
          doc.infrastructureScore ?? "—",
        )}.`,
        timestamp: doc.updatedAt ? String(doc.updatedAt) : undefined,
        status: String(doc.status ?? "active"),
      },
      req.payload,
    );
  } catch (err) {
    console.error("[KXD Activity] infrastructure update hook failed:", err);
  }

  return doc;
};
