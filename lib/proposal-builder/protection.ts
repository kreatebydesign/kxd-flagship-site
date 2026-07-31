/** Local protected proposal — never mutate via lifecycle/builder send paths. */
export const PROTECTED_PROPOSAL_ID = 1;

export function assertNotProtectedProposal(proposalId: number, action: string): void {
  if (proposalId === PROTECTED_PROPOSAL_ID) {
    throw new Error(`Refusing to ${action} for protected Proposal ID 1.`);
  }
}

export function legacyPlaintextTokensAllowed(): boolean {
  return process.env.KXD_ALLOW_LEGACY_PLAINTEXT_TOKENS === "1";
}
