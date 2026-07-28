/**
 * Hosting Renewal Readiness — Batch A (Operator Visibility).
 *
 * Pure, deterministic helpers derived from existing client-infrastructure metadata.
 * No DB writes, no notifications, no migrations. Provider-neutral (Wix is a class, not a system).
 */

export type HostingRenewalUrgency =
  | "unknown"
  | "ok"
  | "watch"
  | "attention"
  | "critical";

export type HostingProviderClass = "wix" | "kxd" | "other" | "unknown";

export type HostingResponsibilityHint =
  | "unknown"
  | "likely_kxd"
  | "likely_client";

export type HostingRenewalDateKind =
  | "hosting_renewal"
  | "domain_expiration"
  | "ssl_expiration";

export type HostingRenewalDateSignal = {
  kind: HostingRenewalDateKind;
  label: string;
  iso: string | null;
  daysRemaining: number | null;
  urgency: HostingRenewalUrgency;
  recommendedAction: string;
};

export type HostingRenewalReadiness = {
  providerRaw: string | null;
  providerClass: HostingProviderClass;
  responsibilityHint: HostingResponsibilityHint;
  hosting: HostingRenewalDateSignal;
  domain: HostingRenewalDateSignal;
  ssl: HostingRenewalDateSignal;
  /** Worst urgency among hosting + domain (SSL is secondary and does not escalate overall alone). */
  overallUrgency: HostingRenewalUrgency;
  overallRecommendedAction: string;
  summaryLabel: string;
};

export type HostingRenewalInput = {
  hostingProvider?: string | null;
  nextRenewalDate?: string | null;
  domainExpirationDate?: string | null;
  sslExpirationDate?: string | null;
  /** Optional onboarding mirror — soft hint only. */
  hostingAccess?: boolean | null;
};

const URGENCY_RANK: Record<HostingRenewalUrgency, number> = {
  critical: 0,
  attention: 1,
  watch: 2,
  unknown: 3,
  ok: 4,
};

/** Calendar date parts in America/Los_Angeles (no wall-clock timezone drift). */
export function pacificDateParts(
  instant: Date = new Date(),
): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(instant);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

/**
 * Parse an ISO/date string into a calendar Y-M-D without local TZ shift.
 * Prefers the date portion when present (YYYY-MM-DD…).
 */
export function parseCalendarDateParts(
  iso: string | null | undefined,
): { year: number; month: number; day: number } | null {
  if (!iso || !String(iso).trim()) return null;
  const s = String(iso).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  // Fallback: interpret instant in Pacific so day is stable for operators.
  return pacificDateParts(d);
}

function calendarDayNumber(parts: { year: number; month: number; day: number }): number {
  // Civil day ordinal via UTC noon to avoid DST edge cases when differencing.
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
}

/** Whole calendar days from today (Pacific) until the target date. Past-due is negative. */
export function daysRemainingDateOnly(
  iso: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const target = parseCalendarDateParts(iso);
  if (!target) return null;
  const today = pacificDateParts(now);
  return calendarDayNumber(target) - calendarDayNumber(today);
}

export function urgencyFromDaysRemaining(
  days: number | null,
): HostingRenewalUrgency {
  if (days == null) return "unknown";
  if (days <= 0) return "critical";
  if (days <= 30) return "attention";
  if (days <= 60) return "watch";
  return "ok";
}

export function classifyHostingProvider(
  hostingProvider: string | null | undefined,
): HostingProviderClass {
  const raw = String(hostingProvider ?? "").trim().toLowerCase();
  if (!raw) return "unknown";
  if (/\bwix\b/.test(raw)) return "wix";
  if (
    /\bkxd\b/.test(raw) ||
    raw.includes("kreate by design") ||
    raw.includes("vercel") ||
    raw.includes("kxd platform")
  ) {
    return "kxd";
  }
  return "other";
}

/**
 * Soft responsibility hint only — never invents authority.
 * Defaults to unknown when signals conflict or are absent.
 */
export function deriveResponsibilityHint(input: {
  hostingProvider?: string | null;
  providerClass?: HostingProviderClass;
  hostingAccess?: boolean | null;
}): HostingResponsibilityHint {
  const providerClass =
    input.providerClass ?? classifyHostingProvider(input.hostingProvider);
  const text = String(input.hostingProvider ?? "").toLowerCase();
  const access = input.hostingAccess;

  const clientSignals =
    /\bclient[- ]managed\b/.test(text) ||
    /\bclient owns\b/.test(text) ||
    /\bclient[- ]hosted\b/.test(text);
  const kxdSignals =
    /\bkxd[- ]managed\b/.test(text) ||
    /\bkxd hosts\b/.test(text) ||
    providerClass === "kxd";

  if (clientSignals && !kxdSignals) return "likely_client";
  if (kxdSignals && !clientSignals) return "likely_kxd";
  if (access === true && providerClass === "wix") return "likely_kxd";
  if (access === false && providerClass === "wix") return "likely_client";
  if (access === true && providerClass === "kxd") return "likely_kxd";
  return "unknown";
}

function actionForDate(
  kind: HostingRenewalDateKind,
  urgency: HostingRenewalUrgency,
  providerClass: HostingProviderClass,
): string {
  if (urgency === "unknown") {
    if (kind === "hosting_renewal") return "Record date in Infrastructure";
    if (kind === "domain_expiration") return "Record domain expiration in Infrastructure";
    return "Record SSL expiration in Infrastructure";
  }
  if (urgency === "critical") {
    if (kind === "hosting_renewal") {
      return providerClass === "wix"
        ? "Past due — confirm Wix renewal or transition plan with the client"
        : "Past due — resolve hosting renewal immediately";
    }
    if (kind === "domain_expiration") return "Past due — resolve domain renewal immediately";
    return "Past due — renew or replace SSL immediately";
  }
  if (urgency === "attention" || urgency === "watch") {
    if (kind === "hosting_renewal") {
      return providerClass === "wix"
        ? "Confirm Wix renewal date and transition posture"
        : "Confirm hosting renewal date and ownership";
    }
    if (kind === "domain_expiration") return "Confirm domain renewal and auto-renew status";
    return "Confirm SSL renewal before expiry";
  }
  return "No immediate renewal action";
}

function buildDateSignal(
  kind: HostingRenewalDateKind,
  label: string,
  iso: string | null | undefined,
  providerClass: HostingProviderClass,
  now: Date,
): HostingRenewalDateSignal {
  const normalized = iso != null && String(iso).trim() ? String(iso) : null;
  const daysRemaining = daysRemainingDateOnly(normalized, now);
  const urgency = urgencyFromDaysRemaining(daysRemaining);
  return {
    kind,
    label,
    iso: normalized,
    daysRemaining,
    urgency,
    recommendedAction: actionForDate(kind, urgency, providerClass),
  };
}

function worseUrgency(
  a: HostingRenewalUrgency,
  b: HostingRenewalUrgency,
): HostingRenewalUrgency {
  return URGENCY_RANK[a] <= URGENCY_RANK[b] ? a : b;
}

export function urgencyBadgeLabel(urgency: HostingRenewalUrgency): string {
  switch (urgency) {
    case "critical":
      return "Critical";
    case "attention":
      return "Attention";
    case "watch":
      return "Watch";
    case "ok":
      return "OK";
    default:
      return "Unknown";
  }
}

export function providerClassLabel(providerClass: HostingProviderClass): string {
  switch (providerClass) {
    case "wix":
      return "Wix";
    case "kxd":
      return "KXD";
    case "other":
      return "Other";
    default:
      return "Unknown";
  }
}

export function responsibilityHintLabel(hint: HostingResponsibilityHint): string {
  switch (hint) {
    case "likely_kxd":
      return "Likely KXD-managed (confirm)";
    case "likely_client":
      return "Likely client-managed (confirm)";
    default:
      return "Ownership unknown — confirm";
  }
}

export function formatDaysRemainingLabel(days: number | null): string {
  if (days == null) return "Date not on file";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past due`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

export function evaluateHostingRenewalReadiness(
  input: HostingRenewalInput,
  now: Date = new Date(),
): HostingRenewalReadiness {
  const providerRaw = input.hostingProvider?.trim()
    ? String(input.hostingProvider).trim()
    : null;
  const providerClass = classifyHostingProvider(providerRaw);
  const responsibilityHint = deriveResponsibilityHint({
    hostingProvider: providerRaw,
    providerClass,
    hostingAccess: input.hostingAccess,
  });

  const hosting = buildDateSignal(
    "hosting_renewal",
    "Hosting renewal",
    input.nextRenewalDate,
    providerClass,
    now,
  );
  const domain = buildDateSignal(
    "domain_expiration",
    "Domain expiration",
    input.domainExpirationDate,
    providerClass,
    now,
  );
  const ssl = buildDateSignal(
    "ssl_expiration",
    "SSL expiration",
    input.sslExpirationDate,
    providerClass,
    now,
  );

  const overallUrgency = worseUrgency(hosting.urgency, domain.urgency);

  let overallRecommendedAction = hosting.recommendedAction;
  if (URGENCY_RANK[domain.urgency] < URGENCY_RANK[hosting.urgency]) {
    overallRecommendedAction = domain.recommendedAction;
  } else if (
    hosting.urgency === "unknown" &&
    domain.urgency === "unknown" &&
    !providerRaw
  ) {
    overallRecommendedAction =
      "Record hosting provider and renewal dates in Infrastructure";
  } else if (hosting.urgency === "ok" && domain.urgency === "ok") {
    overallRecommendedAction =
      responsibilityHint === "unknown"
        ? "Confirm ownership; dates look healthy"
        : "No immediate renewal action";
  }

  const summaryLabel = `${providerClassLabel(providerClass)} · ${urgencyBadgeLabel(overallUrgency)}`;

  return {
    providerRaw,
    providerClass,
    responsibilityHint,
    hosting,
    domain,
    ssl,
    overallUrgency,
    overallRecommendedAction,
    summaryLabel,
  };
}

/** Sort key: worst urgency first, then soonest dated signal, then unknowns. */
export function compareHostingRenewalReadiness(
  a: HostingRenewalReadiness,
  b: HostingRenewalReadiness,
): number {
  const urg = URGENCY_RANK[a.overallUrgency] - URGENCY_RANK[b.overallUrgency];
  if (urg !== 0) return urg;

  const aDays = soonestDays(a);
  const bDays = soonestDays(b);
  if (aDays == null && bDays == null) return 0;
  if (aDays == null) return 1;
  if (bDays == null) return -1;
  return aDays - bDays;
}

function soonestDays(r: HostingRenewalReadiness): number | null {
  const candidates = [r.hosting.daysRemaining, r.domain.daysRemaining].filter(
    (d): d is number => d != null,
  );
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

export function evaluateFromInfrastructureRecord(
  record: {
    hostingProvider?: string | null;
    nextRenewalDate?: string | null;
    domainExpirationDate?: string | null;
    sslExpirationDate?: string | null;
  } | null,
  hostingAccess?: boolean | null,
  now: Date = new Date(),
): HostingRenewalReadiness {
  if (!record) {
    return evaluateHostingRenewalReadiness(
      {
        hostingProvider: null,
        nextRenewalDate: null,
        domainExpirationDate: null,
        sslExpirationDate: null,
        hostingAccess,
      },
      now,
    );
  }
  return evaluateHostingRenewalReadiness(
    {
      hostingProvider: record.hostingProvider,
      nextRenewalDate: record.nextRenewalDate,
      domainExpirationDate: record.domainExpirationDate,
      sslExpirationDate: record.sslExpirationDate,
      hostingAccess,
    },
    now,
  );
}
