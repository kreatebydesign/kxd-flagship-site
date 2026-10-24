/**
 * Lead-scoped mutual exclusion for proposal acceptance (e.g. K&N Option A vs B).
 * Server-only; uses Payload Postgres transaction + row locks.
 */
import "server-only";

import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from "payload";
import { sql } from "@payloadcms/db-postgres";
import { ProposalBuilderError } from "./errors.ts";
import {
  evaluateLeadAcceptanceEligibility,
  findLeadSiblingAcceptanceBlock,
  type LeadAcceptanceEligibility,
  type ProposalAcceptanceRow,
} from "./lead-mutual-acceptance-core.ts";

export type { LeadAcceptanceEligibility, ProposalAcceptanceRow } from "./lead-mutual-acceptance-core.ts";
export {
  evaluateLeadAcceptanceEligibility,
  findLeadSiblingAcceptanceBlock,
  isProposalAcceptanceComplete,
  LEAD_ACCEPTANCE_BLOCKING_STATUSES,
} from "./lead-mutual-acceptance-core.ts";

type TxReq = PayloadRequest & {
  payload: Payload;
  transactionID?: number | string | Promise<number | string | null> | null;
};

function getAdapterSessions(payload: Payload): Record<string, { db: { execute: (q: unknown) => Promise<unknown> } }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = payload.db as any;
  if (!adapter?.sessions || typeof adapter.beginTransaction !== "function") {
    throw new Error("Lead mutual acceptance requires a transactional Postgres adapter.");
  }
  return adapter.sessions as Record<string, { db: { execute: (q: unknown) => Promise<unknown> } }>;
}

async function lockLeadProposalsForUpdate(req: TxReq, leadId: number): Promise<void> {
  const transactionID = await req.transactionID;
  if (!transactionID) {
    throw new Error("Cannot lock lead proposals without an active transaction.");
  }
  const session = getAdapterSessions(req.payload)[String(transactionID)];
  if (!session?.db) {
    throw new Error("Lead acceptance transaction session is unavailable.");
  }
  await session.db.execute(
    sql`SELECT id FROM proposals WHERE lead_id = ${leadId} ORDER BY id FOR UPDATE`,
  );
}

async function beginTx(payload: Payload): Promise<{ req: TxReq; owns: boolean }> {
  const req = { payload } as TxReq;
  const owns = await initTransaction(req);
  if (!owns && !req.transactionID) {
    throw new Error("Failed to begin lead acceptance transaction.");
  }
  return { req, owns };
}

async function endTx(req: TxReq, owns: boolean, ok: boolean): Promise<void> {
  if (!owns) return;
  if (ok) await commitTransaction(req);
  else await killTransaction(req);
}

export async function withLeadProposalAcceptanceTransaction<T>(
  payload: Payload,
  leadId: number,
  work: () => Promise<T>,
): Promise<T> {
  const { req, owns } = await beginTx(payload);
  try {
    await lockLeadProposalsForUpdate(req, leadId);
    const result = await work();
    await endTx(req, owns, true);
    return result;
  } catch (error) {
    await endTx(req, owns, false);
    throw error;
  }
}

export async function loadLeadSiblingProposals(
  payload: Payload,
  leadId: number,
): Promise<ProposalAcceptanceRow[]> {
  const result = await payload.find({
    collection: "proposals" as never,
    where: { lead: { equals: leadId } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.map((doc) => {
    const row = doc as Record<string, unknown>;
    return {
      id: Number(row.id),
      proposalNumber: row.proposalNumber as string | null,
      status: row.status as string | null,
      acceptedSnapshot: row.acceptedSnapshot,
      acceptanceRecord: row.acceptanceRecord,
    };
  });
}

export async function assertLeadSiblingAcceptanceAllowed(
  payload: Payload,
  leadId: number,
  currentProposalId: number,
): Promise<void> {
  const siblings = await loadLeadSiblingProposals(payload, leadId);
  const block = findLeadSiblingAcceptanceBlock(currentProposalId, siblings);
  if (!block.canAccept) {
    throw new ProposalBuilderError(block.reason ?? "This proposal cannot be accepted.", 409);
  }
}

export async function getLeadAcceptanceEligibilityForProposal(
  payload: Payload,
  input: { proposalId: number; leadId: number | null; alreadyAccepted: boolean },
): Promise<LeadAcceptanceEligibility> {
  if (!input.leadId) {
    return {
      canAccept: !input.alreadyAccepted,
      reason: null,
      acceptedSiblingProposalId: null,
      acceptedSiblingProposalNumber: null,
    };
  }
  const siblings = await loadLeadSiblingProposals(payload, input.leadId);
  return evaluateLeadAcceptanceEligibility({
    proposalId: input.proposalId,
    alreadyAccepted: input.alreadyAccepted,
    siblings,
  });
}
