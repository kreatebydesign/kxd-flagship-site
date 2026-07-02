import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { displayContractStatus, isUnsignedContract } from "@/lib/contracts/lifecycle";
import { displayConversionStatus } from "./lifecycle";
import type {
  WorkspaceContractsSnapshot,
  WorkspaceContractRow,
  WorkspaceConversionRow,
  ConversionStatus,
  ConversionMode,
  LaunchStatus,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as AnyDoc).id);
  }
  return null;
}

function toContractRow(doc: AnyDoc, clientId: number): WorkspaceContractRow {
  const id = doc.id as number;
  const proposalId = relId(doc.proposal);
  const proposalTitle =
    typeof doc.proposal === "object" && doc.proposal !== null
      ? String((doc.proposal as AnyDoc).title ?? "")
      : null;

  return {
    id,
    title: String(doc.title ?? "Contract"),
    status: String(doc.status ?? "draft"),
    displayStatus: displayContractStatus(String(doc.status ?? "draft")),
    contractType: doc.contractType ? String(doc.contractType) : null,
    proposalId,
    proposalTitle,
    monthlyAmount: doc.monthlyAmount != null ? Number(doc.monthlyAmount) : null,
    projectAmount: doc.projectAmount != null ? Number(doc.projectAmount) : null,
    sentAt: doc.sentAt ? String(doc.sentAt) : null,
    viewedAt: doc.viewedAt ? String(doc.viewedAt) : null,
    signedAt: doc.signedAt ? String(doc.signedAt) : null,
    expiresAt: doc.expiresAt ? String(doc.expiresAt) : null,
    signerName: doc.signerName ? String(doc.signerName) : null,
    href: `/admin/operations/client-command/${clientId}?tab=contracts`,
  };
}

export async function loadClientContractsSnapshot(
  clientId: number,
): Promise<WorkspaceContractsSnapshot> {
  const payload = await getPayload({ config });

  const [contractsResult, conversionsResult] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "contracts" as any,
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 1,
      sort: "-updatedAt",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposal-conversions" as any,
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 1,
      sort: "-convertedAt",
      overrideAccess: true,
    }),
  ]);

  const contracts = contractsResult.docs.map((doc) =>
    toContractRow(doc as AnyDoc, clientId),
  );

  const conversions: WorkspaceConversionRow[] = conversionsResult.docs.map((doc) => {
    const row = doc as AnyDoc;
    const proposalId = relId(row.proposal) ?? 0;
    const proposalTitle =
      typeof row.proposal === "object" && row.proposal !== null
        ? String((row.proposal as AnyDoc).title ?? "Proposal")
        : "Proposal";
    return {
      id: row.id as number,
      proposalId,
      proposalTitle,
      status: String(row.status ?? "pending") as ConversionStatus,
      conversionMode: String(row.conversionMode ?? "hybrid") as ConversionMode,
      launchStatus: String(row.launchStatus ?? "queued") as LaunchStatus,
      convertedAt: row.convertedAt ? String(row.convertedAt) : null,
      href: `/admin/operations/client-command/${clientId}?tab=contracts`,
    };
  });

  const unsigned = contracts.filter((c) => isUnsignedContract(c.status));
  const signed = contracts.filter((c) => c.status === "signed");
  const current =
    unsigned[0] ??
    contracts.find((c) => c.status !== "archived") ??
    contracts[0] ??
    null;

  return {
    current,
    contracts,
    conversions,
    unsignedCount: unsigned.length,
    signedCount: signed.length,
  };
}
