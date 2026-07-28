/**
 * Shared portal account-context types (safe for client components).
 * Authorization never trusts these values from the browser — they are
 * server-derived summaries for UI only.
 */

export type PortalAccountAccessSource =
  | "membership"
  | "legacy-fallback";

export type PortalAccountOption = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
};

/**
 * Server-built switcher payload. Only present when switching is available.
 * Never includes disabled accounts, secrets, or membership internals.
 */
export type PortalAccountSwitcherModel = {
  activeClientId: number;
  accounts: PortalAccountOption[];
};

export type PortalAccountContextSummary = {
  portalUserId: number;
  activeClientId: number;
  activeClientName: string;
  accessSource: PortalAccountAccessSource;
  /** True only when schema is available and user has >1 authorized accounts. */
  switchingAvailable: boolean;
  /**
   * Portfolio overview is an explicit future capability — never auto-granted
   * merely because the user has multiple memberships.
   */
  portfolioAccessAvailable: boolean;
  authorizedClientIds: number[];
  switcher: PortalAccountSwitcherModel | null;
};
