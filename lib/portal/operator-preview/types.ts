/**
 * Operator Portal Preview — studio operator views a client portal
 * without client credentials, activation, or invitation claim.
 *
 * Scopes:
 * - Single-client (Client Command): `clientId` only
 * - Membership-scoped (Portal Access): `asPortalUserId` + active memberships
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

/**
 * Operator portal session mode.
 * - `preview` — default read-only studio preview (no portal writes)
 * - `staff-test` — explicit writable Website Review test for KXD staff only
 */
export type OperatorPortalPreviewMode = "preview" | "staff-test";

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
  /**
   * Session capability. Absent/`preview` = read-only.
   * `staff-test` allows Website Review writes only (not global portal writes).
   */
  mode?: OperatorPortalPreviewMode;
  /**
   * Optional membership-scoped preview subject (portal-users id).
   * When set, account switcher/portfolio resolve from that user's active
   * memberships. Never activates the user or creates a real portal login.
   */
  asPortalUserId?: number;
  /** Display name for the membership-scoped subject (banner only). */
  asPortalUserDisplayName?: string;
  /** Optional unsaved recommendation overlay for operator preview only. */
  draftComposition?: OperatorPreviewDraftComposition;
};
