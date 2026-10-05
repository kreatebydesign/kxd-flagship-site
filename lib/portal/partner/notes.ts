import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { PartnerNoteItem } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function trim(value: unknown, max = 4000): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export async function assertPartnerOwnsReferral(input: {
  partnerId: number;
  referralId: number;
}): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-referrals" as any,
    where: {
      and: [
        { id: { equals: input.referralId } },
        { sourcedByPartner: { equals: input.partnerId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc | undefined) ?? null;
}

export async function listPartnerReferralNotes(input: {
  partnerId: number;
  referralId: number;
}): Promise<PartnerNoteItem[]> {
  const owned = await assertPartnerOwnsReferral(input);
  if (!owned) return [];

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "partner-referral-notes" as any,
    where: {
      and: [
        { referral: { equals: input.referralId } },
        { sourcedByPartner: { equals: input.partnerId } },
      ],
    },
    limit: 100,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });

  return (result.docs as AnyDoc[]).map((doc) => ({
    id: Number(doc.id),
    body: String(doc.body ?? ""),
    actorDisplayName: String(doc.actorDisplayName ?? ""),
    createdAt: String(doc.createdAt ?? ""),
  }));
}

export async function addPartnerReferralNote(input: {
  partnerId: number;
  partnerName: string;
  actorDisplayName: string;
  referralId: number;
  body: string;
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const body = trim(input.body);
  if (!body) return { ok: false, message: "Note cannot be empty." };

  const owned = await assertPartnerOwnsReferral({
    partnerId: input.partnerId,
    referralId: input.referralId,
  });
  if (!owned) return { ok: false, message: "Referral not found." };

  try {
    const payload = await getPayload({ config });
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referral-notes" as any,
      data: {
        referral: input.referralId,
        sourcedByPartner: input.partnerId,
        sourcedByPartnerName: input.partnerName,
        body,
        actorDisplayName: input.actorDisplayName || input.partnerName,
      },
      overrideAccess: true,
    });
    return { ok: true, id: Number(created.id) };
  } catch (err) {
    console.error("[KXD Partner] Note create failed:", err);
    return { ok: false, message: "Failed to add note." };
  }
}
