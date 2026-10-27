/**
 * Project inquiry intake attribution — pure helpers (no Payload).
 */

export const PROJECT_INQUIRY_SOURCES = [
  "start-project",
  "kxd-intelligence",
  "website-audit",
] as const;

export type ProjectInquirySource = (typeof PROJECT_INQUIRY_SOURCES)[number];

const SOURCE_SET = new Set<string>(PROJECT_INQUIRY_SOURCES);

export function normalizeProjectInquirySource(value: unknown): ProjectInquirySource {
  const raw = String(value ?? "").trim();
  if (SOURCE_SET.has(raw)) return raw as ProjectInquirySource;
  if (raw === "website-audit") return "website-audit";
  return "start-project";
}

export function isIntelligenceProjectInquiry(input: {
  inquirySource?: unknown;
  referralSource?: unknown;
  notes?: unknown;
}): boolean {
  const inquirySource = String(input.inquirySource ?? "").trim();
  if (inquirySource === "kxd-intelligence" || inquirySource === "website-audit") {
    return true;
  }
  const referralSource = String(input.referralSource ?? "").trim();
  if (referralSource === "kxd-intelligence") return true;
  if (String(input.notes ?? "").includes("[KXD Intelligence context]")) return true;
  return false;
}

/** Legacy notes embed audit id before sourceWebsiteAudit existed on the collection. */
export function extractAuditIdFromProjectInquiryNotes(notes: unknown): number | null {
  const text = String(notes ?? "");
  const match = text.match(/Audit ID:\s*(\d+)/i);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function resolveProjectInquiryWebsiteAuditId(input: {
  sourceWebsiteAudit?: unknown;
  notes?: unknown;
}): number | null {
  const rel =
    typeof input.sourceWebsiteAudit === "number"
      ? input.sourceWebsiteAudit
      : typeof input.sourceWebsiteAudit === "object" &&
          input.sourceWebsiteAudit &&
          "id" in input.sourceWebsiteAudit
        ? Number((input.sourceWebsiteAudit as { id: unknown }).id)
        : null;
  if (rel && Number.isFinite(rel) && rel > 0) return rel;
  return extractAuditIdFromProjectInquiryNotes(input.notes);
}

type AcquisitionEnvelopeLike = {
  submissionTouch?: { channel?: string } | null;
  firstTouch?: { channel?: string } | null;
};

/** Measured channel from acquisition envelope at submit time (bounded string). */
export function deriveIntakeChannelFromAcquisition(
  acquisition: unknown,
): string | undefined {
  if (!acquisition || typeof acquisition !== "object") return undefined;
  const env = acquisition as AcquisitionEnvelopeLike;
  const channel =
    env.submissionTouch?.channel?.trim() || env.firstTouch?.channel?.trim();
  if (!channel) return undefined;
  return channel.length > 80 ? channel.slice(0, 79) : channel;
}
