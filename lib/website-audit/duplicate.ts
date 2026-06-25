/**
 * Return a recent audit for the same email + website within 24 hours.
 */
import type { Payload } from "payload";

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RecentAuditRecord = {
  id: number;
  overallScore: number | null;
  grade: string | null;
};

export async function findRecentDuplicateAudit(
  payload: Payload,
  email: string,
  websiteUrl: string,
): Promise<RecentAuditRecord | null> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();

  const { docs } = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-audits" as any,
    where: {
      and: [
        { email: { equals: email } },
        { website: { equals: websiteUrl } },
        { createdAt: { greater_than: since } },
      ],
    },
    sort: "-createdAt",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const doc = docs[0];
  if (!doc) return null;

  return {
    id: Number(doc.id),
    overallScore:
      typeof doc.overallScore === "number" ? doc.overallScore : null,
    grade: typeof doc.grade === "string" ? doc.grade : null,
  };
}
