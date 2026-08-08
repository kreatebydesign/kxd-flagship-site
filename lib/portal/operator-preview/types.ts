/**
 * Operator Portal Preview — studio operator views a single client portal
 * without a portal-user membership or client credentials.
 */

export type OperatorPreviewDraftComposition = {
  /** Proposed portal module ids. Preview-only — does not write the CES profile. */
  modules: string[];
  branding?: {
    clientName?: string;
    portalSidebarLabel?: string;
    welcomeEyebrow?: string;
    reassuranceLine?: string;
    supportTone?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
};

export type OperatorPortalPreviewSession = {
  /** Authenticated Payload admin (`users`) who started preview. */
  adminUserId: number;
  /** Operator email for audit/display — never a portal-user identity. */
  adminEmail: string;
  /** Exact client scope — never trusted from the browser after mint. */
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  startedAt: string;
  expiresAt: string;
  /** Discriminator so cookies cannot be confused with staff preview. */
  kind: "operator-portal-preview";
  /** Optional unsaved recommendation overlay for operator preview only. */
  draftComposition?: OperatorPreviewDraftComposition;
};
