/**
 * Live commercial proposal protection.
 * Identity-based — not a single hardcoded ID.
 * Blocks operator mutation of known live deals. Public view/accept stay available.
 */

export const PROTECTED_PROPOSAL_ID = 1;

const LIVE_DEAL_IDENTITY_NEEDLES = [
  "de bois entertainment",
  "debois entertainment",
  "platinum film workz",
  "mattas motorsports",
] as const;

function isLocalAuditDatabase(): boolean {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!uri) return false;
  try {
    const parsed = new URL(uri);
    const host = parsed.hostname;
    const database = parsed.pathname.replace(/^\//, "").split("?")[0];
    return (
      (host === "127.0.0.1" || host === "localhost") &&
      database === "kxd_audit_report_review"
    );
  } catch {
    return false;
  }
}

export function normalizeProposalIdentity(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function identityHaystack(values: unknown[]): string {
  return values.map((value) => normalizeProposalIdentity(value)).filter(Boolean).join(" | ");
}

export function collectProposalIdentityValues(proposal: Record<string, unknown> | null | undefined): string[] {
  if (!proposal || typeof proposal !== "object") return [];
  const values: unknown[] = [proposal.title, proposal.proposalNumber];

  const client = proposal.client;
  if (client && typeof client === "object") {
    const c = client as Record<string, unknown>;
    values.push(c.name, c.companyName, c.brand);
  }

  const lead = proposal.lead;
  if (lead && typeof lead === "object") {
    const l = lead as Record<string, unknown>;
    values.push(l.companyName, l.name, l.contactName);
  }

  const doc = proposal.builderDocument;
  if (doc && typeof doc === "object") {
    const orgs = (doc as { organizations?: unknown }).organizations;
    if (Array.isArray(orgs)) {
      for (const org of orgs) {
        if (org && typeof org === "object") {
          const o = org as Record<string, unknown>;
          values.push(o.name, o.brand);
        }
      }
    }
  }

  const snap = proposal.shareSnapshot;
  if (snap && typeof snap === "object") {
    const s = snap as Record<string, unknown>;
    values.push(s.primaryOrganization, s.title);
    const orgs = s.organizations;
    if (Array.isArray(orgs)) {
      for (const org of orgs) {
        if (org && typeof org === "object") {
          values.push((org as Record<string, unknown>).name, (org as Record<string, unknown>).brand);
        }
      }
    }
  }

  return values.map((value) => String(value ?? "")).filter((value) => value.trim().length > 0);
}

export function matchesProtectedLiveDealIdentity(values: unknown[]): boolean {
  const haystack = identityHaystack(values);
  if (!haystack) return false;
  return LIVE_DEAL_IDENTITY_NEEDLES.some((needle) => haystack.includes(needle));
}

export function isProtectedLiveCommercialProposal(
  proposal: Record<string, unknown> | number | null | undefined,
): boolean {
  if (proposal == null) return false;
  if (typeof proposal === "number") {
    return isLocalAuditDatabase() && proposal === PROTECTED_PROPOSAL_ID;
  }
  if (typeof proposal !== "object") return false;

  if (isLocalAuditDatabase() && Number(proposal.id) === PROTECTED_PROPOSAL_ID) {
    return true;
  }

  return matchesProtectedLiveDealIdentity(collectProposalIdentityValues(proposal));
}

export function liveDealProtectionReason(proposal: Record<string, unknown>): string {
  return `Refusing operator mutation of a protected live commercial proposal (${String(proposal.proposalNumber ?? proposal.id ?? "unknown")}).`;
}

export function assertNotProtectedProposal(
  proposal: number | Record<string, unknown>,
  action: string,
): void {
  if (typeof proposal === "number") {
    if (isLocalAuditDatabase() && proposal === PROTECTED_PROPOSAL_ID) {
      throw new Error(`Refusing to ${action} for protected Proposal ID 1.`);
    }
    return;
  }
  if (isProtectedLiveCommercialProposal(proposal)) {
    throw new Error(`Refusing to ${action} for a protected live commercial proposal.`);
  }
}

export function legacyPlaintextTokensAllowed(): boolean {
  return process.env.KXD_ALLOW_LEGACY_PLAINTEXT_TOKENS === "1";
}
