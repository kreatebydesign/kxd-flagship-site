/**
 * Client Resource Directory — Batch A (Operator Visibility).
 *
 * Allowlisted, read-only directory derived from existing client-infrastructure
 * (+ clients.companyWebsite, optional onboarding access booleans).
 *
 * Not a credential vault. No secrets, no migrations, no external fetches,
 * no automated access tests, no notifications.
 */

export type ResourceEntryKind = "link" | "text" | "status";

export type ResourceEntryState =
  | "recorded"
  | "missing"
  | "invalid"
  | "withheld"
  | "unknown";

export type ResourceCategoryId =
  | "website_preview"
  | "hosting_deployment"
  | "domain_dns"
  | "analytics_search"
  | "advertising"
  | "communications_email"
  | "repository_development";

export type ResourceEntry = {
  id: string;
  label: string;
  kind: ResourceEntryKind;
  state: ResourceEntryState;
  /** Operator-visible value. Never a secret. */
  displayValue: string | null;
  /** Safe https href when kind=link and state=recorded; otherwise null. */
  href: string | null;
  note: string | null;
};

export type ResourceCategory = {
  id: ResourceCategoryId;
  label: string;
  entries: ResourceEntry[];
};

export type SoftAccessState = "unknown" | "reported_yes" | "reported_no";

export type SoftAccessSignal = {
  id: string;
  label: string;
  state: SoftAccessState;
  detail: string;
};

export type ClientResourceDirectory = {
  categories: ResourceCategory[];
  softAccessSignals: SoftAccessSignal[];
  lastReviewedAt: string | null;
  reviewedBy: string | null;
  disclosure: string;
  hasAnyRecordedValue: boolean;
};

export type ClientResourceDirectoryInput = {
  companyWebsite?: string | null;
  productionUrl?: string | null;
  stagingUrl?: string | null;
  primaryDomain?: string | null;
  hostingProvider?: string | null;
  deploymentStatus?: string | null;
  lastDeploymentDate?: string | null;
  vercelProject?: string | null;
  vercelTeam?: string | null;
  domainRegistrar?: string | null;
  dnsProvider?: string | null;
  domainExpirationDate?: string | null;
  domainAutoRenew?: boolean | null;
  sslStatus?: string | null;
  sslExpirationDate?: string | null;
  analyticsProvider?: string | null;
  ga4PropertyId?: string | null;
  searchConsoleSiteUrl?: string | null;
  searchConsoleStatus?: string | null;
  googleAdsCustomerId?: string | null;
  googleAdsLoginCustomerId?: string | null;
  emailProvider?: string | null;
  workspaceProvider?: string | null;
  emailDomain?: string | null;
  spfStatus?: string | null;
  dkimStatus?: string | null;
  dmarcStatus?: string | null;
  stripeStatus?: string | null;
  resendStatus?: string | null;
  githubRepo?: string | null;
  lastReviewedAt?: string | null;
  reviewedBy?: string | null;
  /** Soft onboarding mirrors — never treated as verified access. */
  websiteAccess?: boolean | null;
  domainAccess?: boolean | null;
  hostingAccess?: boolean | null;
  analyticsAccess?: boolean | null;
  emailAccess?: boolean | null;
};

export const CLIENT_RESOURCE_DIRECTORY_DISCLOSURE =
  "Client Resource Directory is operator guidance only — not a credential vault. " +
  "Passwords, API keys, tokens, and recovery codes are not stored or displayed here. " +
  "Access is not tested automatically, and no automated emails or reminders are sent.";

/** Query/fragment keys that must never appear on an operator link. */
const SECRET_PARAM_PATTERN =
  /^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|auth(?:_token)?|authorization|bearer|password|passwd|pwd|secret|client[_-]?secret|private[_-]?key|session(?:_id)?|sig(?:nature)?|signed|token|jwt|otp|recovery)$/i;

const SUSPICIOUS_VALUE_PATTERN =
  /(?:postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|Bearer\s+[A-Za-z0-9._\-]+|sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/i;

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const VERCEL_HOSTS = new Set(["vercel.com", "www.vercel.com"]);

function trimText(raw: unknown): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

function looksCredentialLike(value: string): boolean {
  return SUSPICIOUS_VALUE_PATTERN.test(value);
}

function hasSecretParams(url: URL): boolean {
  for (const key of url.searchParams.keys()) {
    if (SECRET_PARAM_PATTERN.test(key)) return true;
  }
  if (url.hash && url.hash.length > 1) {
    const hashBody = url.hash.slice(1);
    try {
      const hashParams = new URLSearchParams(hashBody);
      for (const key of hashParams.keys()) {
        if (SECRET_PARAM_PATTERN.test(key)) return true;
      }
    } catch {
      // Non-query hash; still reject if it looks like an embedded secret.
      if (SECRET_PARAM_PATTERN.test(hashBody) || looksCredentialLike(hashBody)) {
        return true;
      }
    }
  }
  return false;
}

export type SafeHttpsResult =
  | { ok: true; href: string; display: string }
  | {
      ok: false;
      reason: "missing" | "invalid" | "unsafe_protocol" | "credentials" | "secret";
    };

/**
 * Validate an operator-facing HTTPS URL.
 * Rejects unsafe protocols, embedded credentials, and secret-bearing query/hash.
 */
export function evaluateSafeHttpsUrl(raw: string | null | undefined): SafeHttpsResult {
  const trimmed = trimText(raw);
  if (!trimmed) return { ok: false, reason: "missing" };
  if (looksCredentialLike(trimmed)) return { ok: false, reason: "secret" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "unsafe_protocol" };
  }
  if (!parsed.hostname) return { ok: false, reason: "invalid" };
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "credentials" };
  }
  if (hasSecretParams(parsed)) return { ok: false, reason: "secret" };
  if (looksCredentialLike(parsed.href)) return { ok: false, reason: "secret" };

  const path = parsed.pathname.replace(/\/+$/, "");
  const href = path ? `${parsed.origin}${path}${parsed.search}` : `${parsed.origin}${parsed.search}`;
  return { ok: true, href, display: href };
}

function hostAllowlisted(href: string, hosts: Set<string>): boolean {
  try {
    const host = new URL(href).hostname.toLowerCase();
    return hosts.has(host);
  } catch {
    return false;
  }
}

function normalizeWebsiteKey(href: string): string | null {
  try {
    const url = new URL(href);
    const path = url.pathname.replace(/\/+$/, "") || "";
    return `${url.protocol}//${url.host.toLowerCase()}${path}`;
  } catch {
    return null;
  }
}

function textEntry(
  id: string,
  label: string,
  raw: string | null | undefined,
  opts?: { note?: string | null; status?: boolean },
): ResourceEntry {
  const value = trimText(raw);
  if (!value) {
    return {
      id,
      label,
      kind: opts?.status ? "status" : "text",
      state: "missing",
      displayValue: null,
      href: null,
      note: opts?.note ?? "Not recorded",
    };
  }
  if (looksCredentialLike(value)) {
    return {
      id,
      label,
      kind: "text",
      state: "withheld",
      displayValue: null,
      href: null,
      note: "Withheld — value resembles a credential or connection string",
    };
  }
  return {
    id,
    label,
    kind: opts?.status ? "status" : "text",
    state: "recorded",
    displayValue: value,
    href: null,
    note: opts?.note ?? null,
  };
}

function booleanEntry(
  id: string,
  label: string,
  raw: boolean | null | undefined,
): ResourceEntry {
  if (raw == null) {
    return {
      id,
      label,
      kind: "status",
      state: "unknown",
      displayValue: null,
      href: null,
      note: "Unknown",
    };
  }
  return {
    id,
    label,
    kind: "status",
    state: "recorded",
    displayValue: raw ? "Yes" : "No",
    href: null,
    note: null,
  };
}

function linkOrInvalidEntry(
  id: string,
  label: string,
  raw: string | null | undefined,
  opts?: {
    note?: string | null;
    requireHosts?: Set<string>;
    allowPlainTextFallback?: boolean;
  },
): ResourceEntry {
  const trimmed = trimText(raw);
  if (!trimmed) {
    return {
      id,
      label,
      kind: "link",
      state: "missing",
      displayValue: null,
      href: null,
      note: "Not recorded",
    };
  }

  // Non-URL identifiers (owner/repo, project slugs) stay plain text when allowed.
  const looksLikeUrl = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//");
  if (!looksLikeUrl && opts?.allowPlainTextFallback) {
    if (looksCredentialLike(trimmed)) {
      return {
        id,
        label,
        kind: "text",
        state: "withheld",
        displayValue: null,
        href: null,
        note: "Withheld — value resembles a credential or connection string",
      };
    }
    return {
      id,
      label,
      kind: "text",
      state: "recorded",
      displayValue: trimmed,
      href: null,
      note: opts.note ?? "Stored as a label — not a verified URL",
    };
  }

  const checked = evaluateSafeHttpsUrl(trimmed);
  if (!checked.ok) {
    const noteByReason: Record<typeof checked.reason, string> = {
      missing: "Not recorded",
      invalid: "Invalid URL — not linkable",
      unsafe_protocol: "Rejected — only https links are allowed",
      credentials: "Rejected — URLs must not include embedded credentials",
      secret: "Withheld — URL appears to contain a secret parameter or credential-like value",
    };
    return {
      id,
      label,
      kind: "link",
      state:
        checked.reason === "secret" || checked.reason === "credentials"
          ? "withheld"
          : checked.reason === "missing"
            ? "missing"
            : "invalid",
      displayValue: null,
      href: null,
      note: noteByReason[checked.reason],
    };
  }

  if (opts?.requireHosts && !hostAllowlisted(checked.href, opts.requireHosts)) {
    return {
      id,
      label,
      kind: "text",
      state: "recorded",
      displayValue: checked.display,
      href: null,
      note: "Recorded URL is outside the approved host allowlist — shown as text only",
    };
  }

  return {
    id,
    label,
    kind: "link",
    state: "recorded",
    displayValue: checked.display,
    href: checked.href,
    note: opts?.note ?? null,
  };
}

function searchConsoleEntry(raw: string | null | undefined): ResourceEntry {
  const trimmed = trimText(raw);
  if (!trimmed) {
    return {
      id: "search-console-property",
      label: "Search Console property",
      kind: "text",
      state: "missing",
      displayValue: null,
      href: null,
      note: "Not recorded",
    };
  }
  if (/^sc-domain:/i.test(trimmed)) {
    if (looksCredentialLike(trimmed)) {
      return {
        id: "search-console-property",
        label: "Search Console property",
        kind: "text",
        state: "withheld",
        displayValue: null,
        href: null,
        note: "Withheld — value resembles a credential or connection string",
      };
    }
    return {
      id: "search-console-property",
      label: "Search Console property",
      kind: "text",
      state: "recorded",
      displayValue: trimmed,
      href: null,
      note: "Domain property identifier — shown as text (not a URL)",
    };
  }
  return linkOrInvalidEntry("search-console-property", "Search Console property", trimmed);
}

function softAccessSignal(
  id: string,
  label: string,
  value: boolean | null | undefined,
): SoftAccessSignal {
  if (value == null) {
    return {
      id,
      label,
      state: "unknown",
      detail: "Unknown — no onboarding access signal on file",
    };
  }
  if (value) {
    return {
      id,
      label,
      state: "reported_yes",
      detail: "Reported in onboarding — not verified access",
    };
  }
  return {
    id,
    label,
    state: "reported_no",
    detail: "Onboarding marked as not provided — not verified",
  };
}

export function softAccessStateLabel(state: SoftAccessState): string {
  switch (state) {
    case "reported_yes":
      return "Reported yes";
    case "reported_no":
      return "Reported no";
    default:
      return "Unknown";
  }
}

export function resourceEntryStateLabel(state: ResourceEntryState): string {
  switch (state) {
    case "recorded":
      return "Recorded";
    case "missing":
      return "Missing";
    case "invalid":
      return "Invalid";
    case "withheld":
      return "Withheld";
    default:
      return "Unknown";
  }
}

/**
 * Build the allowlisted Client Resource Directory model.
 * Never serializes notes, secrets, or non-allowlisted fields.
 */
export function buildClientResourceDirectory(
  input: ClientResourceDirectoryInput,
): ClientResourceDirectory {
  const production = linkOrInvalidEntry("production-url", "Production URL", input.productionUrl);
  const companyWebsite = linkOrInvalidEntry(
    "company-website",
    "Company website",
    input.companyWebsite,
  );

  const websiteEntries: ResourceEntry[] = [];
  const prodKey =
    production.href != null ? normalizeWebsiteKey(production.href) : null;
  const companyKey =
    companyWebsite.href != null ? normalizeWebsiteKey(companyWebsite.href) : null;
  const duplicate =
    prodKey != null && companyKey != null && prodKey === companyKey;

  if (duplicate) {
    websiteEntries.push({
      ...production,
      note: production.note
        ? `${production.note} · Matches company website`
        : "Matches company website",
    });
  } else if (production.state !== "missing") {
    websiteEntries.push(production);
    if (companyWebsite.state !== "missing") {
      websiteEntries.push(companyWebsite);
    }
  } else if (companyWebsite.state !== "missing") {
    websiteEntries.push({
      ...companyWebsite,
      id: "website-fallback",
      label: "Website",
      note:
        companyWebsite.note ??
        "From client company website (production URL not recorded)",
    });
  } else {
    websiteEntries.push(production);
  }

  websiteEntries.push(
    linkOrInvalidEntry("preview-website", "Preview website", input.stagingUrl),
    textEntry("primary-domain", "Primary domain", input.primaryDomain),
  );

  const categories: ResourceCategory[] = [
    {
      id: "website_preview",
      label: "Website & preview",
      entries: websiteEntries,
    },
    {
      id: "hosting_deployment",
      label: "Hosting & deployment",
      entries: [
        textEntry("hosting-provider", "Hosting provider", input.hostingProvider),
        textEntry("deployment-status", "Deployment status", input.deploymentStatus, {
          status: true,
        }),
        textEntry("last-deployment", "Last deployment", input.lastDeploymentDate),
        linkOrInvalidEntry("vercel-project", "Vercel project", input.vercelProject, {
          requireHosts: VERCEL_HOSTS,
          allowPlainTextFallback: true,
        }),
        textEntry("vercel-team", "Vercel team", input.vercelTeam),
      ],
    },
    {
      id: "domain_dns",
      label: "Domain & DNS",
      entries: [
        textEntry("domain-registrar", "Domain registrar", input.domainRegistrar),
        textEntry("dns-provider", "DNS provider", input.dnsProvider),
        textEntry("domain-expiration", "Domain expiration", input.domainExpirationDate),
        booleanEntry("domain-auto-renew", "Domain auto-renew", input.domainAutoRenew),
        textEntry("ssl-status", "SSL status", input.sslStatus, { status: true }),
        textEntry("ssl-expiration", "SSL expiration", input.sslExpirationDate),
      ],
    },
    {
      id: "analytics_search",
      label: "Analytics & search",
      entries: [
        textEntry("analytics-provider", "Analytics provider", input.analyticsProvider),
        textEntry("ga4-property-id", "GA4 property ID", input.ga4PropertyId),
        searchConsoleEntry(input.searchConsoleSiteUrl),
        textEntry("search-console-status", "Search Console status", input.searchConsoleStatus, {
          status: true,
        }),
      ],
    },
    {
      id: "advertising",
      label: "Advertising",
      entries: [
        textEntry("google-ads-customer-id", "Google Ads customer ID", input.googleAdsCustomerId, {
          note: trimText(input.googleAdsCustomerId)
            ? "Account identifier only — not a login URL"
            : "Not recorded",
        }),
        textEntry(
          "google-ads-login-customer-id",
          "Google Ads login customer ID (MCC)",
          input.googleAdsLoginCustomerId,
          {
            note: trimText(input.googleAdsLoginCustomerId)
              ? "Manager account identifier only — not a login URL"
              : "Not recorded",
          },
        ),
      ],
    },
    {
      id: "communications_email",
      label: "Communications & email",
      entries: [
        textEntry("email-provider", "Email provider", input.emailProvider),
        textEntry("workspace-provider", "Workspace provider", input.workspaceProvider),
        textEntry("email-domain", "Email domain", input.emailDomain),
        textEntry("spf-status", "SPF", input.spfStatus, { status: true }),
        textEntry("dkim-status", "DKIM", input.dkimStatus, { status: true }),
        textEntry("dmarc-status", "DMARC", input.dmarcStatus, { status: true }),
        textEntry("stripe-status", "Stripe status", input.stripeStatus, { status: true }),
        textEntry("resend-status", "Resend status", input.resendStatus, { status: true }),
      ],
    },
    {
      id: "repository_development",
      label: "Repository & development",
      entries: [
        linkOrInvalidEntry("github-repo", "GitHub repository", input.githubRepo, {
          requireHosts: GITHUB_HOSTS,
          allowPlainTextFallback: true,
        }),
      ],
    },
  ];

  const softAccessSignals: SoftAccessSignal[] = [
    softAccessSignal("website-access", "Website access", input.websiteAccess),
    softAccessSignal("domain-access", "Domain access", input.domainAccess),
    softAccessSignal("hosting-access", "Hosting access", input.hostingAccess),
    softAccessSignal("analytics-access", "Analytics access", input.analyticsAccess),
    softAccessSignal("email-access", "Email access", input.emailAccess),
  ];

  const hasAnyRecordedValue = categories.some((category) =>
    category.entries.some((entry) => entry.state === "recorded"),
  );

  return {
    categories,
    softAccessSignals,
    lastReviewedAt: trimText(input.lastReviewedAt),
    reviewedBy: trimText(input.reviewedBy),
    disclosure: CLIENT_RESOURCE_DIRECTORY_DISCLOSURE,
    hasAnyRecordedValue,
  };
}

/**
 * Map allowlisted fields from existing infra / client / onboarding docs.
 * Intentionally omits free-form notes, DNS dumps, cost ownership text,
 * vault references, and executive-profile link bags.
 */
export function buildClientResourceDirectoryFromRecords(input: {
  record: Record<string, unknown> | null;
  client: Record<string, unknown>;
  onboardingAccess?: {
    websiteAccess?: boolean | null;
    domainAccess?: boolean | null;
    hostingAccess?: boolean | null;
    analyticsAccess?: boolean | null;
    emailAccess?: boolean | null;
  } | null;
}): ClientResourceDirectory {
  const record = input.record ?? {};
  const client = input.client ?? {};
  const access = input.onboardingAccess ?? {};

  return buildClientResourceDirectory({
    companyWebsite: (client.companyWebsite as string | null | undefined) ?? null,
    productionUrl: (record.productionUrl as string | null | undefined) ?? null,
    stagingUrl: (record.stagingUrl as string | null | undefined) ?? null,
    primaryDomain: (record.primaryDomain as string | null | undefined) ?? null,
    hostingProvider: (record.hostingProvider as string | null | undefined) ?? null,
    deploymentStatus: (record.deploymentStatus as string | null | undefined) ?? null,
    lastDeploymentDate: (record.lastDeploymentDate as string | null | undefined) ?? null,
    vercelProject: (record.vercelProject as string | null | undefined) ?? null,
    vercelTeam: (record.vercelTeam as string | null | undefined) ?? null,
    domainRegistrar: (record.domainRegistrar as string | null | undefined) ?? null,
    dnsProvider: (record.dnsProvider as string | null | undefined) ?? null,
    domainExpirationDate: (record.domainExpirationDate as string | null | undefined) ?? null,
    domainAutoRenew:
      typeof record.domainAutoRenew === "boolean" ? record.domainAutoRenew : null,
    sslStatus: (record.sslStatus as string | null | undefined) ?? null,
    sslExpirationDate: (record.sslExpirationDate as string | null | undefined) ?? null,
    analyticsProvider: (record.analyticsProvider as string | null | undefined) ?? null,
    ga4PropertyId: (record.ga4PropertyId as string | null | undefined) ?? null,
    searchConsoleSiteUrl: (record.searchConsoleSiteUrl as string | null | undefined) ?? null,
    searchConsoleStatus: (record.searchConsoleStatus as string | null | undefined) ?? null,
    googleAdsCustomerId: (record.googleAdsCustomerId as string | null | undefined) ?? null,
    googleAdsLoginCustomerId:
      (record.googleAdsLoginCustomerId as string | null | undefined) ?? null,
    emailProvider: (record.emailProvider as string | null | undefined) ?? null,
    workspaceProvider: (record.workspaceProvider as string | null | undefined) ?? null,
    emailDomain: (record.emailDomain as string | null | undefined) ?? null,
    spfStatus: (record.spfStatus as string | null | undefined) ?? null,
    dkimStatus: (record.dkimStatus as string | null | undefined) ?? null,
    dmarcStatus: (record.dmarcStatus as string | null | undefined) ?? null,
    stripeStatus: (record.stripeStatus as string | null | undefined) ?? null,
    resendStatus: (record.resendStatus as string | null | undefined) ?? null,
    githubRepo: (record.githubRepo as string | null | undefined) ?? null,
    lastReviewedAt: (record.lastReviewedAt as string | null | undefined) ?? null,
    reviewedBy: (record.reviewedBy as string | null | undefined) ?? null,
    websiteAccess: access.websiteAccess ?? null,
    domainAccess: access.domainAccess ?? null,
    hostingAccess: access.hostingAccess ?? null,
    analyticsAccess: access.analyticsAccess ?? null,
    emailAccess: access.emailAccess ?? null,
  });
}
