/**
 * Junior Creator / Research Desk intake validation.
 * Separates opportunity URL from contact email/phone.
 * Never treat emails as URLs.
 */

export type ResearchIntakeInput = {
  opportunityUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** Legacy single field — classified, never mixed. */
  leadUrl?: string | null;
  businessName?: string | null;
  city?: string | null;
  state?: string | null;
  estimatedService?: string | null;
  notes?: string | null;
  source?: string | null;
};

export type NormalizedResearchIntake = {
  opportunityUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /** Legacy mirror: prefer opportunity URL when present, else leave null for new intake. */
  leadUrl: string | null;
  businessName: string | null;
  city: string | null;
  state: string | null;
  estimatedService: string | null;
  notes: string | null;
  source: string;
};

export type ResearchIntakeResult =
  | { ok: true; data: NormalizedResearchIntake }
  | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  // Craigslist relay and normal emails — never treat as URL.
  if (EMAIL_RE.test(v)) return true;
  if (v.includes("@") && !/^https?:\/\//i.test(v) && !v.includes(" ")) return true;
  return false;
}

export function looksLikeHttpUrl(value: string): boolean {
  const v = value.trim();
  if (!v || looksLikeEmail(v)) return false;
  try {
    const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const u = new URL(withProtocol);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Preserve exact user string for URLs that already include a scheme. */
export function normalizeOpportunityUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v || looksLikeEmail(v)) return null;
  if (!looksLikeHttpUrl(v)) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function normalizeContactEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (!looksLikeEmail(v)) return null;
  // Prefer strict emails when possible; still accept CL-style relays with @.
  return v;
}

export function normalizeContactPhone(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return v;
}

/**
 * Classify legacy leadUrl without inventing contact data for historical rows.
 * Used for display and for new submissions that still send leadUrl.
 */
export function classifyLegacyLeadUrl(leadUrl: string | null | undefined): {
  opportunityUrl: string | null;
  contactEmail: string | null;
} {
  if (!leadUrl?.trim()) return { opportunityUrl: null, contactEmail: null };
  const v = leadUrl.trim();
  if (looksLikeEmail(v)) {
    return { opportunityUrl: null, contactEmail: normalizeContactEmail(v) };
  }
  if (looksLikeHttpUrl(v)) {
    return { opportunityUrl: normalizeOpportunityUrl(v), contactEmail: null };
  }
  return { opportunityUrl: null, contactEmail: null };
}

export function normalizeResearchIntake(input: ResearchIntakeInput): ResearchIntakeResult {
  let opportunityUrl = input.opportunityUrl?.trim()
    ? normalizeOpportunityUrl(input.opportunityUrl)
    : null;
  let contactEmail = input.contactEmail?.trim()
    ? normalizeContactEmail(input.contactEmail)
    : null;
  const contactPhone = input.contactPhone?.trim()
    ? normalizeContactPhone(input.contactPhone)
    : null;

  // Explicit email field must never land in opportunity URL.
  if (input.opportunityUrl?.trim() && looksLikeEmail(input.opportunityUrl)) {
    return {
      ok: false,
      message:
        "Opportunity Link should be a web page URL. Put emails in Contact Email instead.",
    };
  }

  if (input.opportunityUrl?.trim() && !opportunityUrl) {
    return {
      ok: false,
      message: "Opportunity Link must be a valid web page URL (https://…).",
    };
  }

  if (input.contactEmail?.trim() && !contactEmail) {
    return { ok: false, message: "Contact Email does not look like a valid email." };
  }

  if (input.contactPhone?.trim() && !contactPhone) {
    return { ok: false, message: "Phone needs at least 7 digits." };
  }

  // Legacy leadUrl classification for transitional clients.
  if (input.leadUrl?.trim()) {
    const legacy = classifyLegacyLeadUrl(input.leadUrl);
    if (!opportunityUrl && legacy.opportunityUrl) opportunityUrl = legacy.opportunityUrl;
    if (!contactEmail && legacy.contactEmail) contactEmail = legacy.contactEmail;
    if (
      !legacy.opportunityUrl &&
      !legacy.contactEmail &&
      !opportunityUrl &&
      !contactEmail &&
      !contactPhone
    ) {
      return {
        ok: false,
        message:
          "Provide an Opportunity Link, Contact Email, or Phone so the lead is usable.",
      };
    }
  }

  if (!opportunityUrl && !contactEmail && !contactPhone) {
    return {
      ok: false,
      message:
        "Add at least one: Opportunity Link, Contact Email, or Phone.",
    };
  }

  return {
    ok: true,
    data: {
      opportunityUrl,
      contactEmail,
      contactPhone,
      // Keep legacy column aligned for older readers; prefer opportunity URL.
      leadUrl: opportunityUrl,
      businessName: input.businessName?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      estimatedService: input.estimatedService?.trim() || null,
      notes: input.notes?.trim() || null,
      source: input.source?.trim() || "Craigslist",
    },
  };
}

export function resolveResearchContactDisplay(doc: {
  opportunityUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  leadUrl?: string | null;
}): {
  opportunityUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
} {
  const legacy = classifyLegacyLeadUrl(doc.leadUrl);
  return {
    opportunityUrl: doc.opportunityUrl?.trim() || legacy.opportunityUrl,
    contactEmail: doc.contactEmail?.trim() || legacy.contactEmail,
    contactPhone: doc.contactPhone?.trim() || null,
  };
}
