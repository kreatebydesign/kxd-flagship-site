/**
 * Client-safe Care & Continuity projection.
 * Pure — reuses hosting-renewal-readiness; never invents dates or costs.
 */

import {
  classifyHostingProvider,
  deriveResponsibilityHint,
  evaluateHostingRenewalReadiness,
  type HostingRenewalInput,
  type HostingRenewalReadiness,
} from "@/lib/infrastructure/hosting-renewal-readiness";
import type {
  ClientCareContinuity,
  ClientCareContinuityLine,
  ClientCareContinuityStatus,
  ClientValueAvailability,
} from "./types";

export type ComposeCareContinuityInput = HostingRenewalInput & {
  primaryDomain?: string | null;
  domainAutoRenew?: boolean | null;
  now?: Date;
};

function clientHostingLabel(raw: string | null | undefined): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const cls = classifyHostingProvider(text);
  if (cls === "kxd") return "KXD-managed website hosting";
  if (cls === "wix") return "Wix hosting";
  if (/vercel/i.test(text)) return "Modern cloud hosting";
  if (/shopify/i.test(text)) return "Shopify hosting";
  if (/wordpress|wp engine|siteground|bluehost/i.test(text)) {
    return "WordPress hosting";
  }
  return "Website hosting on file";
}

function responsiblePartyLabel(
  readiness: HostingRenewalReadiness,
  status: ClientCareContinuityStatus,
): string | null {
  // Avoid stacking “watching/monitoring” when the headline already carries that idea.
  if (status === "monitoring" || status === "renewal-unknown" || status === "not-configured") {
    return null;
  }
  if (readiness.responsibilityHint === "likely_kxd") {
    return "KXD handles renewal tracking for this website.";
  }
  if (readiness.responsibilityHint === "likely_client") {
    return "Some renewal steps may need your confirmation.";
  }
  return null;
}

function renewsInLabel(days: number | null): string | null {
  if (days == null) return null;
  if (days < 0) return "Past the recorded date — KXD is reviewing next steps";
  if (days === 0) return "Due today — KXD is reviewing next steps";
  if (days === 1) return "Renews in 1 day";
  return `Renews in ${days} days`;
}

function mapStatus(
  readiness: HostingRenewalReadiness,
  primaryDomain: string | null | undefined,
): {
  status: ClientCareContinuityStatus;
  availability: ClientValueAvailability;
  headline: string;
  lead: string;
} {
  const hasAnyDate =
    readiness.hosting.iso != null || readiness.domain.iso != null;
  const hasProvider = Boolean(readiness.providerRaw?.trim());
  const hasDomain = Boolean(String(primaryDomain ?? "").trim());

  if (!hasProvider && !hasAnyDate && !hasDomain) {
    return {
      status: "not-configured",
      availability: "unknown",
      headline: "Website care",
      lead: "Hosting and domain details will appear here when KXD records them for this business.",
    };
  }

  if (readiness.overallUrgency === "critical" || readiness.overallUrgency === "attention") {
    const clientAction = readiness.responsibilityHint === "likely_client";
    return {
      status: "action-needed",
      availability: "action-needed",
      headline: clientAction ? "Action needed" : "Renewal needs attention",
      lead: clientAction
        ? "A hosting or domain date needs attention soon. KXD will guide the next step clearly."
        : "A renewal window is close. KXD is on it and will reach out if you need to do anything.",
    };
  }

  if (!hasAnyDate) {
    return {
      status: "renewal-unknown",
      availability: "monitoring",
      headline: "Website care on file",
      lead: "Hosting or domain details are recorded. Exact renewal dates will appear here once confirmed.",
    };
  }

  if (readiness.overallUrgency === "watch") {
    return {
      status: "monitoring",
      availability: "monitoring",
      headline: "Renewal window ahead",
      lead: "Nothing urgent today. A renewal is coming up, and KXD is tracking the date.",
    };
  }

  if (readiness.overallUrgency === "unknown") {
    return {
      status: "renewal-unknown",
      availability: "unknown",
      headline: "Website care on file",
      lead: "Some renewal details are still being confirmed. What we already know is shown below.",
    };
  }

  return {
    status: "protected-and-active",
    availability: "ready",
    headline: "Protected and active",
    lead: "Your website hosting and domain care are in good shape. Nothing urgent needs your attention right now.",
  };
}

/**
 * Only emit lines with client-useful facts. Never spam “unknown” placeholders.
 */
function buildLines(
  input: ComposeCareContinuityInput,
  readiness: HostingRenewalReadiness,
  status: ClientCareContinuityStatus,
): ClientCareContinuityLine[] {
  if (status === "not-configured") return [];

  const lines: ClientCareContinuityLine[] = [];
  const hostingLabel = clientHostingLabel(input.hostingProvider);
  if (hostingLabel) {
    lines.push({
      id: "hosting",
      label: "Website hosting",
      value: hostingLabel,
      detail: null,
    });
  }

  const hostingDays = readiness.hosting.daysRemaining;
  if (readiness.hosting.iso) {
    lines.push({
      id: "hosting-renewal",
      label: "Hosting renewal",
      value: renewsInLabel(hostingDays) ?? "Date on file",
      detail: null,
    });
  }

  const domainName = String(input.primaryDomain ?? "").trim() || null;
  const domainDays = readiness.domain.daysRemaining;
  if (domainName || readiness.domain.iso) {
    lines.push({
      id: "domain",
      label: "Domain",
      value: domainName
        ? domainName.replace(/^https?:\/\//i, "").replace(/\/$/, "")
        : "Domain on file",
      detail: readiness.domain.iso
        ? renewsInLabel(domainDays) ?? "Expiration date on file"
        : null,
    });
  }

  if (input.domainAutoRenew === true) {
    lines.push({
      id: "domain-autorenew",
      label: "Domain auto-renew",
      value: "On",
      detail: null,
    });
  }

  return lines.slice(0, 5);
}

/**
 * Compose client-safe Care & Continuity from allowlisted infrastructure fields.
 */
export function composeCareContinuity(
  input: ComposeCareContinuityInput,
): ClientCareContinuity {
  const now = input.now ?? new Date();
  const readiness = evaluateHostingRenewalReadiness(
    {
      hostingProvider: input.hostingProvider,
      nextRenewalDate: input.nextRenewalDate,
      domainExpirationDate: input.domainExpirationDate,
      hostingAccess: input.hostingAccess,
    },
    now,
  );
  void classifyHostingProvider(input.hostingProvider);
  void deriveResponsibilityHint({
    hostingProvider: input.hostingProvider,
    hostingAccess: input.hostingAccess,
  });

  const mapped = mapStatus(readiness, input.primaryDomain);
  return {
    availability: mapped.availability,
    status: mapped.status,
    headline: mapped.headline,
    lead: mapped.lead,
    lines: buildLines(input, readiness, mapped.status),
    hostingLabel: clientHostingLabel(input.hostingProvider),
    responsiblePartyLabel: responsiblePartyLabel(readiness, mapped.status),
  };
}
