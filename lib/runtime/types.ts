/**
 * Phase 30B — KXD OS Runtime Contract types.
 * Framework-neutral vocabulary for web and future desktop shells.
 */

export type KxdRuntimeKind =
  | "web"
  | "desktop-macos"
  | "desktop-windows"
  | "desktop-linux";

export type KxdRuntimeSurface = "studio" | "portal" | "marketing" | "unknown";

/**
 * Capability IDs — detected explicitly; never inferred solely from runtime kind.
 */
export type KxdCapabilityId =
  | "notifications"
  | "secure-storage"
  | "open-external-url"
  | "reveal-file"
  | "open-file"
  | "save-file"
  | "download"
  | "clipboard"
  | "application-badge"
  | "native-menu"
  | "updater"
  | "deep-links"
  | "background-execution"
  | "filesystem"
  | "biometric-authentication"
  | "operating-system-information"
  | "theme";

export type KxdCapabilitySupport =
  | "supported"
  | "unsupported"
  | "requires-permission"
  | "unknown";

export type KxdCapabilityState = {
  id: KxdCapabilityId;
  support: KxdCapabilitySupport;
  /** True only after explicit user-granted permission when applicable. */
  permissionGranted: boolean | null;
  detail?: string;
};

export type KxdRuntimeCapabilities = Readonly<
  Record<KxdCapabilityId, KxdCapabilityState>
>;

export type KxdRuntimeInfo = {
  kind: KxdRuntimeKind;
  surface: KxdRuntimeSurface;
  /** Semantic contract version for shell ↔ app negotiation. */
  contractVersion: string;
  /** True when a native bridge host is present (future Tauri). */
  hasNativeBridge: boolean;
  /** Canonical remote application origin (never a local Payload authority). */
  applicationOrigin: string | null;
  initializedAt: string;
};

export const KXD_RUNTIME_CONTRACT_VERSION = "30B.1";

export const KXD_CAPABILITY_IDS: readonly KxdCapabilityId[] = [
  "notifications",
  "secure-storage",
  "open-external-url",
  "reveal-file",
  "open-file",
  "save-file",
  "download",
  "clipboard",
  "application-badge",
  "native-menu",
  "updater",
  "deep-links",
  "background-execution",
  "filesystem",
  "biometric-authentication",
  "operating-system-information",
  "theme",
] as const;
