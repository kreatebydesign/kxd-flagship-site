/**
 * Phase 30B — Authentication contract for web + future desktop.
 *
 * Desktop uses the existing authentication system.
 * No parallel desktop account. No passwords in keychain.
 * Sessions stay in httpOnly cookies (WebView cookie jar) — never localStorage.
 */

export type AuthSessionKind = "payload-admin" | "portal" | "junior-creators" | "none";

export type AuthContractRules = {
  /** Single identity system for Studio operators. */
  studioIdentity: "payload-users";
  /** Portal remains separate HMAC cookie — browser primary. */
  portalIdentity: "portal-hmac-cookie";
  /** Forbidden storage for session tokens. */
  forbidSessionInLocalStorage: true;
  /** Forbidden: store passwords anywhere in the shell. */
  forbidPasswordStorage: true;
  /**
   * Future keychain may hold device unlock material or OAuth refresh
   * for server-injected env — never operator passwords, never Neon URLs.
   */
  futureKeychainAllowed: Array<
    "device-unlock-secret" | "oauth-refresh-token" | "update-channel-token"
  >;
};

export const AUTH_CONTRACT: AuthContractRules = {
  studioIdentity: "payload-users",
  portalIdentity: "portal-hmac-cookie",
  forbidSessionInLocalStorage: true,
  forbidPasswordStorage: true,
  futureKeychainAllowed: [
    "device-unlock-secret",
    "oauth-refresh-token",
    "update-channel-token",
  ],
};

/**
 * Deep-link return after OAuth must land on allowlisted Studio paths
 * and complete against the canonical remote host — never a local Payload.
 */
export type OAuthReturnPolicy = {
  requireCanonicalHost: true;
  allowlistedReturnPathPrefixes: string[];
};

export const OAUTH_RETURN_POLICY: OAuthReturnPolicy = {
  requireCanonicalHost: true,
  allowlistedReturnPathPrefixes: [
    "/admin/operations",
    "/admin/work",
    "/admin/sales",
    "/os",
    "/api/admin/",
  ],
};

export type SignOutScope = "studio" | "portal" | "all-local-device";

/**
 * Sign-out expectations (implementation remains in existing auth helpers).
 */
export const SIGN_OUT_CONTRACT = {
  clearHttpOnlyCookies: true,
  clearWebViewCookieJar: true,
  /** Optional future: wipe keychain device unlock only — not business data. */
  clearDeviceUnlockMaterial: true,
  /** Never delete Neon / Payload records on sign-out. */
  mutateBusinessRecords: false,
} as const;
