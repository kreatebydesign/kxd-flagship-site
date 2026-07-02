import type { CollectionAfterChangeHook } from "payload";
import { publishRevenueEvent, relId } from "@/lib/financial-command/timeline-publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function proposalAmount(doc: AnyDoc): number {
  const snap = doc.pricingSnapshot as Record<string, unknown> | undefined;
  if (snap?.grandOneTimeTotal != null) return Number(snap.grandOneTimeTotal);
  return Number(doc.investment ?? 0);
}

export const publishProposalRevenueHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  const status = String(doc.status ?? "");
  const prev = String((previousDoc as AnyDoc | undefined)?.status ?? "");
  if (status !== "approved" || prev === "approved") return doc;

  try {
    const proposalId = doc.id as number;
    const clientId = relId(doc.client);
    await publishRevenueEvent(
      {
        eventType: "revenue.proposal-approved",
        title: `Proposal approved · ${doc.title ?? doc.proposalNumber}`,
        summary: "Approved proposal — revenue pipeline updated.",
        amount: proposalAmount(doc as AnyDoc),
        clientId,
        proposalId,
        dedupeKey: `proposal-approved:${proposalId}`,
        metadata: { proposalNumber: doc.proposalNumber },
      },
      req.payload,
    );
  } catch (err) {
    console.error("[KXD Financial] Proposal revenue hook failed:", err);
  }
  return doc;
};

export const publishContractRevenueHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  const status = String(doc.status ?? "");
  const prev = String((previousDoc as AnyDoc | undefined)?.status ?? "");
  if (status !== "signed" || prev === "signed") return doc;

  try {
    const contractId = doc.id as number;
    const clientId = relId(doc.client);
    const monthly = Number(doc.monthlyAmount ?? 0);
    const project = Number(doc.projectAmount ?? 0);
    await publishRevenueEvent(
      {
        eventType: "revenue.contract-signed",
        title: `Contract signed · ${doc.title}`,
        summary: "Contract executed — contracted revenue recognized.",
        amount: project + monthly * 12,
        clientId,
        contractId,
        proposalId: relId(doc.proposal) ?? undefined,
        dedupeKey: `contract-signed:${contractId}`,
      },
      req.payload,
    );
  } catch (err) {
    console.error("[KXD Financial] Contract revenue hook failed:", err);
  }
  return doc;
};

export const publishRetainerRevenueHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const retainerId = doc.id as number;
  const clientId = relId(doc.client);
  const status = String(doc.billingStatus ?? "");
  const prev = String((previousDoc as AnyDoc | undefined)?.billingStatus ?? "");
  const monthly = Number(doc.monthlyAmount ?? 0);

  try {
    if (operation === "create" && monthly > 0) {
      await publishRevenueEvent(
        {
          eventType: "revenue.retainer-started",
          title: `Retainer started · ${doc.retainerName}`,
          summary: "New retainer agreement — MRR updated.",
          amount: monthly,
          clientId,
          retainerId,
          dedupeKey: `retainer-started:${retainerId}`,
        },
        req.payload,
      );
    }

    if (status === "ended" && prev !== "ended") {
      await publishRevenueEvent(
        {
          eventType: "revenue.retainer-ended",
          title: `Retainer ended · ${doc.retainerName}`,
          summary: "Retainer billing ended.",
          amount: monthly,
          clientId,
          retainerId,
          dedupeKey: `retainer-ended:${retainerId}`,
        },
        req.payload,
      );
    }

    const renewal = doc.renewalDate ? String(doc.renewalDate) : null;
    const prevRenewal = (previousDoc as AnyDoc | undefined)?.renewalDate
      ? String((previousDoc as AnyDoc).renewalDate)
      : null;
    if (renewal && renewal !== prevRenewal && operation === "update") {
      await publishRevenueEvent(
        {
          eventType: "revenue.retainer-renewed",
          title: `Retainer renewed · ${doc.retainerName}`,
          summary: `Next renewal ${renewal}.`,
          amount: monthly,
          clientId,
          retainerId,
          dedupeKey: `retainer-renewed:${retainerId}:${renewal}`,
        },
        req.payload,
      );
    }
  } catch (err) {
    console.error("[KXD Financial] Retainer revenue hook failed:", err);
  }
  return doc;
};

export const publishProjectRevenueHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  const status = String(doc.status ?? "");
  const prev = String((previousDoc as AnyDoc | undefined)?.status ?? "");
  const clientId = relId(doc.client);
  const projectId = doc.id as number;
  const budget = Number(doc.budget ?? 0);

  try {
    if (status === "launched" && prev !== "launched") {
      await publishRevenueEvent(
        {
          eventType: "revenue.project-launched",
          title: `Project launched · ${doc.projectName}`,
          summary: "Project entered launch phase.",
          amount: budget || undefined,
          clientId,
          projectId,
          dedupeKey: `project-launched:${projectId}`,
        },
        req.payload,
      );
    }

    if (status === "archived" && prev !== "archived" && prev === "launched") {
      await publishRevenueEvent(
        {
          eventType: "revenue.project-completed",
          title: `Project completed · ${doc.projectName}`,
          summary: "Project archived after launch — delivery complete.",
          amount: budget || undefined,
          clientId,
          projectId,
          dedupeKey: `project-completed:${projectId}`,
        },
        req.payload,
      );
    }
  } catch (err) {
    console.error("[KXD Financial] Project revenue hook failed:", err);
  }
  return doc;
};
