import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import type { BillingStatus, WorkspaceBillingProfile } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function deriveMissingFlags(doc: AnyDoc | null): string[] {
  const flags: string[] = [];
  if (!doc) {
    return ["missing-profile", "missing-billing-email", "missing-payment-terms"];
  }
  if (!doc.billingEmail) flags.push("missing-billing-email");
  if (!doc.billingContact) flags.push("missing-billing-contact");
  if (!doc.paymentTerms) flags.push("missing-payment-terms");
  if (!doc.stripeCustomerId && !doc.quickbooksCustomerId && !doc.waveCustomerId) {
    flags.push("missing-external-id");
  }
  return flags;
}

export async function loadBillingProfile(
  clientId: number,
  payloadInstance?: Payload,
): Promise<WorkspaceBillingProfile> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const doc = (result.docs[0] as AnyDoc) ?? null;
  const storedFlags = (doc?.missingSetupFlags as string[] | undefined) ?? [];
  const derivedFlags = deriveMissingFlags(doc);
  const missingSetupFlags = [...new Set([...storedFlags, ...derivedFlags])];
  const billingStatus = String(doc?.billingStatus ?? "not-configured") as BillingStatus;

  return {
    id: doc?.id as number | null ?? null,
    billingContact: doc?.billingContact ? String(doc.billingContact) : null,
    billingEmail: doc?.billingEmail ? String(doc.billingEmail) : null,
    paymentPreference: doc?.paymentPreference ? String(doc.paymentPreference) : null,
    invoiceCadence: doc?.invoiceCadence ? String(doc.invoiceCadence) : null,
    paymentTerms: doc?.paymentTerms ? String(doc.paymentTerms) : null,
    billingStatus,
    missingSetupFlags,
    setupComplete:
      billingStatus === "active" && missingSetupFlags.length === 0,
  };
}

export interface UpdateBillingProfileInput {
  billingContact?: string;
  billingEmail?: string;
  paymentPreference?: string;
  invoiceCadence?: string;
  paymentTerms?: string;
  billingStatus?: BillingStatus;
  executiveNotes?: string;
}

export async function upsertBillingProfile(
  clientId: number,
  input: UpdateBillingProfileInput,
  payloadInstance?: Payload,
): Promise<WorkspaceBillingProfile> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const flags = deriveMissingFlags({
    ...input,
    billingEmail: input.billingEmail,
    billingContact: input.billingContact,
    paymentTerms: input.paymentTerms,
  } as AnyDoc);

  const data = {
    client: clientId,
    billingContact: input.billingContact,
    billingEmail: input.billingEmail,
    paymentPreference: input.paymentPreference,
    invoiceCadence: input.invoiceCadence,
    paymentTerms: input.paymentTerms,
    billingStatus: input.billingStatus ?? (flags.length === 0 ? "active" : "partial"),
    missingSetupFlags: flags,
    executiveNotes: input.executiveNotes,
  };

  if (existing.docs[0]) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "billing-profiles" as any,
      id: (existing.docs[0] as AnyDoc).id,
      data,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "billing-profiles" as any,
      data,
      overrideAccess: true,
    });
  }

  return loadBillingProfile(clientId, payload);
}
