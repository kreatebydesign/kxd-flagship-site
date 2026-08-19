/** Local QA fixture only. Production proposal IDs are not reserved. */
export const PROTECTED_PROPOSAL_ID = 1;

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

export function assertNotProtectedProposal(proposalId: number, action: string): void {
  if (isLocalAuditDatabase() && proposalId === PROTECTED_PROPOSAL_ID) {
    throw new Error(`Refusing to ${action} for protected Proposal ID 1.`);
  }
}

export function legacyPlaintextTokensAllowed(): boolean {
  return process.env.KXD_ALLOW_LEGACY_PLAINTEXT_TOKENS === "1";
}
