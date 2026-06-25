/**
 * IP rate limiting for website audits — backed by Payload / Postgres (no paid service).
 */
import type { Payload } from "payload";

const MAX_ATTEMPTS_PER_HOUR = 3;
const WINDOW_MS = 60 * 60 * 1000;

export class AuditRateLimitError extends Error {
  constructor() {
    super(
      "You've reached the audit limit for now. Please try again in about an hour, or contact KXD directly.",
    );
    this.name = "AuditRateLimitError";
  }
}

export async function assertAuditRateLimit(
  payload: Payload,
  clientIp: string,
): Promise<void> {
  if (clientIp === "unknown") return;

  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { totalDocs } = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-audit-attempts" as any,
    where: {
      and: [
        { ip: { equals: clientIp } },
        { createdAt: { greater_than: since } },
      ],
    },
    limit: 0,
    overrideAccess: true,
  });

  if (totalDocs >= MAX_ATTEMPTS_PER_HOUR) {
    throw new AuditRateLimitError();
  }

  await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-audit-attempts" as any,
    data: { ip: clientIp },
    overrideAccess: true,
  });
}
