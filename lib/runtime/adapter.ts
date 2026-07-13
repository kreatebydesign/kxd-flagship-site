/**
 * Phase 30B — Runtime adapter interface.
 * Application code talks only to this contract — never to Tauri/Electron APIs.
 */

import type { KxdRuntimeResult } from "./errors";
import type {
  KxdRuntimeCapabilities,
  KxdRuntimeInfo,
  KxdRuntimeKind,
} from "./types";
import type { KxdConnectivityStatus } from "./events";
import type {
  DownloadRequest,
  DownloadHandle,
  OpenFileRequest,
  OpenFileResult,
  SaveFileRequest,
  SaveFileResult,
} from "./files";
import type { OpenExternalUrlRequest } from "./navigation";
import type { DeepLinkParseResult } from "./deep-links";

export type ClipboardWriteRequest = {
  text: string;
};

export type NotificationRequest = {
  title: string;
  body?: string;
  href?: string;
  tag?: string;
};

export type SecureStorageGetRequest = { key: string };
export type SecureStorageSetRequest = { key: string; value: string };
export type SecureStorageDeleteRequest = { key: string };

export type RevealFileRequest = { path: string };

export type BadgeRequest = { count: number | null };

export type ThemeScheme = "light" | "dark" | "unknown";

export type OsInformation = {
  platform: string;
  arch?: string;
  version?: string;
  locale?: string;
};

/**
 * Thin host adapter. Must not contain business domain logic.
 */
export interface KxdRuntimeAdapter {
  readonly kind: KxdRuntimeKind;

  initialize(): Promise<KxdRuntimeResult<KxdRuntimeInfo>>;

  getInfo(): KxdRuntimeInfo | null;

  getCapabilities(): KxdRuntimeCapabilities;

  refreshCapabilities(): Promise<KxdRuntimeCapabilities>;

  getConnectivity(): KxdConnectivityStatus;

  openExternalUrl(
    request: OpenExternalUrlRequest,
  ): Promise<KxdRuntimeResult<{ opened: true }>>;

  parseDeepLink(raw: string): KxdRuntimeResult<DeepLinkParseResult>;

  writeClipboard(
    request: ClipboardWriteRequest,
  ): Promise<KxdRuntimeResult<{ written: true }>>;

  showNotification(
    request: NotificationRequest,
  ): Promise<KxdRuntimeResult<{ shown: true }>>;

  requestNotificationPermission(): Promise<
    KxdRuntimeResult<{ granted: boolean }>
  >;

  download(request: DownloadRequest): Promise<KxdRuntimeResult<DownloadHandle>>;

  openFile(request: OpenFileRequest): Promise<KxdRuntimeResult<OpenFileResult>>;

  saveFile(request: SaveFileRequest): Promise<KxdRuntimeResult<SaveFileResult>>;

  revealFile(request: RevealFileRequest): Promise<KxdRuntimeResult<{ revealed: true }>>;

  setBadge(request: BadgeRequest): Promise<KxdRuntimeResult<{ set: true }>>;

  getTheme(): Promise<KxdRuntimeResult<{ scheme: ThemeScheme }>>;

  getOsInformation(): Promise<KxdRuntimeResult<OsInformation>>;

  secureStorageGet(
    request: SecureStorageGetRequest,
  ): Promise<KxdRuntimeResult<{ value: string | null }>>;

  secureStorageSet(
    request: SecureStorageSetRequest,
  ): Promise<KxdRuntimeResult<{ stored: true }>>;

  secureStorageDelete(
    request: SecureStorageDeleteRequest,
  ): Promise<KxdRuntimeResult<{ deleted: true }>>;

  checkForUpdate(): Promise<
    KxdRuntimeResult<{ available: boolean; version?: string }>
  >;
}
