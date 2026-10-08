/**
 * MotorsportReg organization calendar XML — same feed the live Primal website uses.
 * Does not invent capacity, counts, or webhooks.
 */

export const MOTORSPORTREG_DEFAULT_ORG_ID = "BA9C75BB-EB9B-2362-AE2184E1D7323AE1";

export type MotorsportRegCalendarEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  detailUri: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueRegion: string | null;
  eventType: string | null;
  cancelled: boolean;
};

function decodeXmlText(value: string): string {
  return value
    .replace(/&#x2f;/gi, "/")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function readTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1] ? decodeXmlText(match[1]) : "";
}

function readVenueTag(block: string, tag: string): string {
  const venue = block.match(/<venue>([\s\S]*?)<\/venue>/);
  if (!venue) return "";
  return readTag(venue[1]!, tag);
}

/** Include cancelled events so KXD can record truthful status. */
export function parseMotorsportRegCalendarXml(xml: string): MotorsportRegCalendarEvent[] {
  const blocks = xml.match(/<event>[\s\S]*?<\/event>/g) ?? [];
  return blocks
    .map((block) => {
      const startDate = readTag(block, "start");
      const endDate = readTag(block, "end") || null;
      return {
        id: readTag(block, "id"),
        name: readTag(block, "name"),
        startDate,
        endDate,
        detailUri: readTag(block, "detailuri") || null,
        venueName: readVenueTag(block, "name") || null,
        venueCity: readVenueTag(block, "city") || null,
        venueRegion: readVenueTag(block, "region") || null,
        eventType: readTag(block, "type") || null,
        cancelled: readTag(block, "cancelled") === "true",
      } satisfies MotorsportRegCalendarEvent;
    })
    .filter((event) => event.id && event.name && event.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function motorsportRegCalendarUrl(): string {
  const organizationId =
    process.env.MOTORSPORTREG_ORGANIZATION_ID?.trim() || MOTORSPORTREG_DEFAULT_ORG_ID;
  const apiBase =
    process.env.MOTORSPORTREG_API_BASE_URL?.trim() || "https://api.motorsportreg.com/rest";
  return `${apiBase.replace(/\/$/, "")}/calendars/organization/${organizationId}`;
}

export function normalizeMotorsportRegId(id: string): string {
  return id.trim().toUpperCase();
}

export function mapMotorsportRegType(raw: string | null): "school" | "race" | "other" {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("school") || value === "hpde") return "school";
  if (value.includes("race") || value.includes("track")) return "race";
  return "other";
}

const MOTORSPORTREG_HOST = /(^|\.)motorsportreg\.com$/i;

/**
 * True when a URL is a customer-actionable MotorsportReg http(s) destination.
 * Rejects relative native checkout paths and non-MSR hosts.
 */
export function isMotorsportRegRegistrationUrl(
  value: string | null | undefined,
): value is string {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return MOTORSPORTREG_HOST.test(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Public registration link for calendar projection.
 * MSR-sourced paid events must use the authoritative MotorsportReg URL when present.
 * Never invent native `/register?eventId=` checkout for MSR events (not production-ready).
 * Manual/custom events keep their configured sourceUrl unchanged.
 */
export function resolvePublicRegistrationHref(input: {
  sourceSystem: string;
  sourceUrl: string | null | undefined;
}): string | null {
  if (input.sourceSystem === "motorsportreg") {
    return isMotorsportRegRegistrationUrl(input.sourceUrl) ? input.sourceUrl.trim() : null;
  }
  const url = typeof input.sourceUrl === "string" ? input.sourceUrl.trim() : "";
  return url || null;
}
