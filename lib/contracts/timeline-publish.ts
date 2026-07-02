/**
 * Payload-safe contract timeline publish — no server-only.
 */
import type { Payload } from "payload";
import { publishClientActivity } from "@/lib/client-command/activity/publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as AnyDoc).id);
  }
  return null;
}

export async function logContractActivityRecord(
  payload: Payload,
  input: {
    contractId: number;
    clientId?: number | null;
    eventType: string;
    title: string;
    summary?: string;
    actor?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "contract-activity" as any,
    data: {
      contract: input.contractId,
      client: input.clientId ?? undefined,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      actor: input.actor ?? "KXD Contract Engine",
      occurredAt: new Date().toISOString(),
      metadata: input.metadata,
    },
    overrideAccess: true,
  });
}

export async function publishContractLifecycleEvent(
  doc: AnyDoc,
  eventType: string,
  payload: Payload,
  summary?: string,
): Promise<void> {
  const contractId = doc.id as number;
  const clientId = relId(doc.client);
  const proposalId = relId(doc.proposal);
  const title = String(doc.title ?? "Contract");

  await logContractActivityRecord(payload, {
    contractId,
    clientId,
    eventType,
    title,
    summary,
    metadata: {
      status: doc.status,
      proposalId,
    },
  });

  if (clientId) {
    await publishClientActivity(
      {
        clientId,
        eventType,
        title,
        summary: summary ?? `Contract ${String(doc.status ?? "").replace(/-/g, " ")}.`,
        sourceModule: "Growth",
        sourceType: "contract",
        sourceId: contractId,
        timestamp: new Date().toISOString(),
        priority: eventType === "contract.signed" ? "high" : "normal",
        metadata: {
          contractId,
          proposalId,
          status: doc.status,
        },
      },
      payload,
    );
  }
}
