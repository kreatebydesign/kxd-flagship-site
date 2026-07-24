/**
 * Phase 30B — Settings ownership model (no UI).
 */

export type SettingsScope =
  | "server"
  | "device"
  | "secure-device"
  | "session";

export type SettingsOwnership = {
  scope: SettingsScope;
  /** Where values live. */
  storage: string;
  /** Survives sign-out? */
  survivesSignOut: boolean;
  /** May contain secrets? */
  mayContainSecrets: boolean;
  examples: string[];
};

/**
 * Permanent ownership map — UI deferred.
 */
export const SETTINGS_OWNERSHIP: readonly SettingsOwnership[] = [
  {
    scope: "server",
    storage: "Payload / Neon via authenticated APIs",
    survivesSignOut: true,
    mayContainSecrets: false,
    examples: [
      "operator profile preferences synced to account",
      "edition configuration",
      "client infrastructure connection IDs",
    ],
  },
  {
    scope: "device",
    storage: "localStorage / future shell preferences store",
    survivesSignOut: true,
    mayContainSecrets: false,
    examples: [
      "workspace memory pins",
      "command palette recents",
      "saved display timezone preference",
      "Light / Dark / System appearance preference",
      "notification opt-in toggles (non-secret)",
    ],
  },
  {
    scope: "secure-device",
    storage: "OS keychain via native bridge (future)",
    survivesSignOut: false,
    mayContainSecrets: true,
    examples: [
      "device unlock material",
      "OAuth refresh tokens for host-injected server env (never in renderer)",
    ],
  },
  {
    scope: "session",
    storage: "memory / sessionStorage",
    survivesSignOut: false,
    mayContainSecrets: false,
    examples: [
      "ephemeral UI drafts",
      "CES review session pins (sessionStorage)",
      "temporary panel open state",
    ],
  },
] as const;

export function settingsForScope(scope: SettingsScope): SettingsOwnership | undefined {
  return SETTINGS_OWNERSHIP.find((s) => s.scope === scope);
}
