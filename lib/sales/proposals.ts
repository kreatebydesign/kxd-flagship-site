import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { OptionalService, ProposalSectionBlock, SalesDoc } from "./types";

const PROPOSALS = "proposals";
const SECTIONS = "proposal-sections";

export async function generateProposalNumber(): Promise<string> {
  const payload = await getPayload({ config });
  const year = new Date().getFullYear();
  const prefix = `KXD-P-${year}-`;

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PROPOSALS as any,
    limit: 1,
    sort: "-createdAt",
    where: {
      proposalNumber: { contains: prefix },
    },
    overrideAccess: true,
  });

  const last = result.docs[0] as SalesDoc | undefined;
  let seq = 1;
  if (last?.proposalNumber) {
    const match = String(last.proposalNumber).match(/-(\d+)$/);
    if (match) seq = Number(match[1]) + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function getProposalsList(limit = 100): Promise<SalesDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PROPOSALS as any,
    limit,
    depth: 1,
    sort: "-updatedAt",
    overrideAccess: true,
  });
  return result.docs as SalesDoc[];
}

export async function getProposalById(id: number): Promise<SalesDoc | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: PROPOSALS as any,
      id,
      depth: 2,
      overrideAccess: true,
    });
    return doc as SalesDoc;
  } catch {
    return null;
  }
}

export async function getSectionTemplates(): Promise<SalesDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: SECTIONS as any,
    limit: 100,
    sort: "sortOrder",
    where: { active: { equals: true } },
    overrideAccess: true,
  });
  return result.docs as SalesDoc[];
}

export interface CreateProposalInput {
  title: string;
  leadId?: number;
  clientId?: number;
  executiveSummary?: string;
  scope?: string;
  deliverables?: string;
  timeline?: string;
  terms?: string;
  investment?: number;
  recurringAmount?: number;
  investmentSummary?: string;
  sectionBlocks?: ProposalSectionBlock[];
  optionalServices?: OptionalService[];
  expiresAt?: string;
}

export async function createProposalRecord(input: CreateProposalInput): Promise<SalesDoc> {
  const payload = await getPayload({ config });
  const proposalNumber = await generateProposalNumber();

  const data: Record<string, unknown> = {
    proposalNumber,
    title: input.title,
    status: "draft",
    executiveSummary: input.executiveSummary,
    scope: input.scope,
    deliverables: input.deliverables,
    timeline: input.timeline,
    terms: input.terms,
    investment: input.investment,
    recurringAmount: input.recurringAmount,
    investmentSummary: input.investmentSummary,
    sectionBlocks: input.sectionBlocks,
    optionalServices: input.optionalServices,
    expiresAt: input.expiresAt,
  };

  if (input.leadId) data.lead = input.leadId;
  if (input.clientId) data.client = input.clientId;

  const record = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PROPOSALS as any,
    data: data as never,
    overrideAccess: true,
  });

  if (input.leadId) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id: input.leadId,
      data: { status: "proposal" },
      overrideAccess: true,
    });
  }

  return record as SalesDoc;
}

export async function updateProposalRecord(
  id: number,
  data: Record<string, unknown>,
): Promise<SalesDoc> {
  const payload = await getPayload({ config });
  const record = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: PROPOSALS as any,
    id,
    data: data as never,
    overrideAccess: true,
  });
  return record as SalesDoc;
}

export async function getClientsForProposalPicker(limit = 200): Promise<SalesDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "clients" as any,
    limit,
    sort: "name",
    overrideAccess: true,
  });
  return result.docs as SalesDoc[];
}

export async function getLeadsForProposalPicker(limit = 200): Promise<SalesDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "sales-leads" as any,
    limit,
    sort: "-updatedAt",
    where: {
      status: { not_in: ["won", "lost"] },
    },
    overrideAccess: true,
  });
  return result.docs as SalesDoc[];
}
