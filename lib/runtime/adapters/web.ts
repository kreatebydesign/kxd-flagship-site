/**
 * Phase 30B — Browser (web) runtime adapter.
 * Truthful capabilities only. No fake native behavior.
 * No permission prompts during initialize().
 */

import type {
  BadgeRequest,
  ClipboardWriteRequest,
  KxdRuntimeAdapter,
  NotificationRequest,
  OsInformation,
  RevealFileRequest,
  SecureStorageDeleteRequest,
  SecureStorageGetRequest,
  SecureStorageSetRequest,
  ThemeScheme,
} from "../adapter";
import { capabilityState } from "../capabilities";
import {
  detectBrowserConnectivity,
  type KxdConnectivityStatus,
} from "../connectivity";
import { parseDeepLink } from "../deep-links";
import { detectRuntime } from "../detect";
import { runtimeEvents } from "../events";
import {
  runtimeFail,
  runtimeOk,
  unsupported,
  type KxdRuntimeResult,
} from "../errors";
import {
  sanitizeFilename,
  validateDownloadUrl,
  type DownloadHandle,
  type DownloadRequest,
  type OpenFileRequest,
  type OpenFileResult,
  type SaveFileRequest,
  type SaveFileResult,
} from "../files";
import {
  validateExternalUrl,
  type OpenExternalUrlRequest,
} from "../navigation";
import type {
  KxdRuntimeCapabilities,
  KxdRuntimeInfo,
} from "../types";
import { KXD_RUNTIME_CONTRACT_VERSION } from "../types";

function probeWebCapabilities(): KxdRuntimeCapabilities {
  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";

  const notificationSupport =
    hasWindow && "Notification" in window
      ? "requires-permission"
      : "unsupported";
  let notificationGranted: boolean | null = null;
  if (notificationSupport === "requires-permission") {
    notificationGranted = Notification.permission === "granted";
  }

  const clipboardSupport =
    hasNavigator && Boolean(navigator.clipboard?.writeText)
      ? "requires-permission"
      : "unsupported";

  const badgeSupport =
    hasNavigator && "setAppBadge" in navigator
      ? "requires-permission"
      : "unsupported";

  const themeSupport =
    hasWindow && typeof window.matchMedia === "function"
      ? "supported"
      : "unsupported";

  return {
    notifications: capabilityState(
      "notifications",
      notificationSupport,
      notificationGranted,
      "Browser Notification API — permission only after user gesture",
    ),
    "secure-storage": capabilityState(
      "secure-storage",
      "unsupported",
      null,
      "OS keychain unavailable on web; use httpOnly cookies for sessions",
    ),
    "open-external-url": capabilityState(
      "open-external-url",
      hasWindow ? "supported" : "unsupported",
      null,
    ),
    "reveal-file": capabilityState(
      "reveal-file",
      "unsupported",
      null,
      "Finder/Explorer reveal requires native shell",
    ),
    "open-file": capabilityState(
      "open-file",
      hasWindow ? "supported" : "unsupported",
      null,
      "Via HTML file input",
    ),
    "save-file": capabilityState(
      "save-file",
      hasWindow ? "supported" : "unsupported",
      null,
      "Via browser download",
    ),
    download: capabilityState(
      "download",
      hasWindow ? "supported" : "unsupported",
      null,
    ),
    clipboard: capabilityState(
      "clipboard",
      clipboardSupport,
      null,
      "Requires user gesture / permission",
    ),
    "application-badge": capabilityState(
      "application-badge",
      badgeSupport,
      null,
    ),
    "native-menu": capabilityState("native-menu", "unsupported", null),
    updater: capabilityState("updater", "unsupported", null),
    "deep-links": capabilityState(
      "deep-links",
      "unsupported",
      null,
      "kxdos:// protocol not registered in browser; parse helpers available",
    ),
    "background-execution": capabilityState(
      "background-execution",
      "unsupported",
      null,
    ),
    filesystem: capabilityState("filesystem", "unsupported", null),
    "biometric-authentication": capabilityState(
      "biometric-authentication",
      "unsupported",
      null,
    ),
    "operating-system-information": capabilityState(
      "operating-system-information",
      hasNavigator ? "supported" : "unsupported",
      null,
      "Coarse browser UA/platform only",
    ),
    theme: capabilityState("theme", themeSupport, null),
  };
}

let downloadSeq = 0;

export class WebRuntimeAdapter implements KxdRuntimeAdapter {
  readonly kind = "web" as const;

  private info: KxdRuntimeInfo | null = null;
  private capabilities: KxdRuntimeCapabilities = probeWebCapabilities();

  async initialize(): Promise<KxdRuntimeResult<KxdRuntimeInfo>> {
    const detected = detectRuntime();
    this.capabilities = probeWebCapabilities();
    this.info = {
      kind: "web",
      surface: detected.surface,
      contractVersion: KXD_RUNTIME_CONTRACT_VERSION,
      hasNativeBridge: false,
      applicationOrigin: detected.applicationOrigin,
      initializedAt: new Date().toISOString(),
    };

    runtimeEvents.emit("runtime-ready", {
      kind: this.info.kind,
      contractVersion: this.info.contractVersion,
      at: this.info.initializedAt,
    });

    const connectivity = this.getConnectivity();
    runtimeEvents.emit("connectivity", {
      status: connectivity,
      at: new Date().toISOString(),
    });

    return runtimeOk(this.info);
  }

  getInfo(): KxdRuntimeInfo | null {
    return this.info;
  }

  getCapabilities(): KxdRuntimeCapabilities {
    return this.capabilities;
  }

  async refreshCapabilities(): Promise<KxdRuntimeCapabilities> {
    this.capabilities = probeWebCapabilities();
    runtimeEvents.emit("runtime-capabilities-changed", {
      at: new Date().toISOString(),
      changed: Object.keys(this.capabilities),
    });
    return this.capabilities;
  }

  getConnectivity(): KxdConnectivityStatus {
    return detectBrowserConnectivity().status;
  }

  async openExternalUrl(
    request: OpenExternalUrlRequest,
  ): Promise<KxdRuntimeResult<{ opened: true }>> {
    if (this.capabilities["open-external-url"].support !== "supported") {
      return unsupported("open-external-url");
    }
    const validated = validateExternalUrl(request);
    if (!validated.ok) return validated;

    const opened = window.open(validated.value.url, "_blank", "noopener,noreferrer");
    if (!opened) {
      return runtimeFail(
        "permission-denied",
        "Browser blocked opening the external URL (popup blocker).",
        { capability: "open-external-url" },
      );
    }
    return runtimeOk({ opened: true });
  }

  parseDeepLink(raw: string) {
    return parseDeepLink(raw);
  }

  async writeClipboard(
    request: ClipboardWriteRequest,
  ): Promise<KxdRuntimeResult<{ written: true }>> {
    if (this.capabilities.clipboard.support === "unsupported") {
      return unsupported("clipboard");
    }
    try {
      await navigator.clipboard.writeText(request.text);
      return runtimeOk({ written: true });
    } catch {
      return runtimeFail(
        "permission-denied",
        "Clipboard write failed. Requires a user gesture and permission.",
        { capability: "clipboard" },
      );
    }
  }

  async showNotification(
    request: NotificationRequest,
  ): Promise<KxdRuntimeResult<{ shown: true }>> {
    if (this.capabilities.notifications.support === "unsupported") {
      return unsupported("notifications");
    }
    if (Notification.permission !== "granted") {
      return runtimeFail(
        "permission-denied",
        "Notification permission not granted. Call requestNotificationPermission after a user gesture.",
        { capability: "notifications" },
      );
    }
    // eslint-disable-next-line no-new
    new Notification(request.title, {
      body: request.body,
      tag: request.tag,
    });
    return runtimeOk({ shown: true });
  }

  async requestNotificationPermission(): Promise<
    KxdRuntimeResult<{ granted: boolean }>
  > {
    if (this.capabilities.notifications.support === "unsupported") {
      return unsupported("notifications");
    }
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    await this.refreshCapabilities();
    return runtimeOk({ granted });
  }

  async download(
    request: DownloadRequest,
  ): Promise<KxdRuntimeResult<DownloadHandle>> {
    if (this.capabilities.download.support !== "supported") {
      return unsupported("download");
    }
    const validated = validateDownloadUrl(request.url);
    if (!validated.ok) return validated;

    const id = `web-dl-${++downloadSeq}`;
    const filename = sanitizeFilename(request.filename ?? "download");

    try {
      const absolute =
        validated.value.url.startsWith("/")
          ? new URL(validated.value.url, window.location.origin).toString()
          : validated.value.url;

      const response = await fetch(absolute, {
        credentials: request.credentials ?? "same-origin",
      });
      if (!response.ok) {
        return runtimeFail("network", `Download failed with HTTP ${response.status}.`, {
          capability: "download",
          details: { status: response.status },
        });
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      const handle: DownloadHandle = {
        id,
        filename,
        status: "completed",
        localRef: objectUrl,
        bytesReceived: blob.size,
        cancel: () => undefined,
      };
      // Revoke later — caller may still need the ref briefly.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return runtimeOk(handle);
    } catch (err) {
      return runtimeFail("network", "Download failed.", {
        capability: "download",
        details: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  async openFile(
    request: OpenFileRequest,
  ): Promise<KxdRuntimeResult<OpenFileResult>> {
    if (this.capabilities["open-file"].support !== "supported") {
      return unsupported("open-file");
    }

    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      if (request.accept) input.accept = request.accept;
      if (request.multiple) input.multiple = true;

      let settled = false;
      const finish = (result: KxdRuntimeResult<OpenFileResult>) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      input.addEventListener("change", () => {
        const list = input.files ? Array.from(input.files) : [];
        finish(
          runtimeOk({
            files: list.map((file, index) => ({
              name: sanitizeFilename(file.name),
              size: file.size,
              type: file.type,
              handleId: `web-file-${Date.now()}-${index}`,
            })),
          }),
        );
      });
      input.addEventListener("cancel", () => {
        finish(runtimeFail("cancelled", "File open cancelled.", { capability: "open-file" }));
      });

      input.click();
    });
  }

  async saveFile(
    request: SaveFileRequest,
  ): Promise<KxdRuntimeResult<SaveFileResult>> {
    if (this.capabilities["save-file"].support !== "supported") {
      return unsupported("save-file");
    }
    const filename = sanitizeFilename(request.filename);
    let blobParts: BlobPart[];
    if (request.encoding === "base64") {
      const binary = atob(request.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      blobParts = [bytes.buffer];
    } else {
      blobParts = [request.data];
    }
    const blob = new Blob(blobParts, { type: request.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return runtimeOk({ filename, saved: true, localRef: objectUrl });
  }

  async revealFile(
    _request: RevealFileRequest,
  ): Promise<KxdRuntimeResult<{ revealed: true }>> {
    return unsupported("reveal-file");
  }

  async setBadge(
    request: BadgeRequest,
  ): Promise<KxdRuntimeResult<{ set: true }>> {
    if (this.capabilities["application-badge"].support === "unsupported") {
      return unsupported("application-badge");
    }
    try {
      const nav = navigator as Navigator & {
        setAppBadge?: (n?: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
      };
      if (request.count === null || request.count <= 0) {
        await nav.clearAppBadge?.();
      } else {
        await nav.setAppBadge?.(request.count);
      }
      return runtimeOk({ set: true });
    } catch {
      return runtimeFail("permission-denied", "Could not set application badge.", {
        capability: "application-badge",
      });
    }
  }

  async getTheme(): Promise<KxdRuntimeResult<{ scheme: ThemeScheme }>> {
    if (this.capabilities.theme.support !== "supported") {
      return unsupported("theme");
    }
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return runtimeOk({ scheme: dark ? "dark" : "light" });
  }

  async getOsInformation(): Promise<KxdRuntimeResult<OsInformation>> {
    if (
      this.capabilities["operating-system-information"].support !== "supported"
    ) {
      return unsupported("operating-system-information");
    }
    return runtimeOk({
      platform: navigator.platform || "unknown",
      locale: navigator.language,
    });
  }

  async secureStorageGet(
    _request: SecureStorageGetRequest,
  ): Promise<KxdRuntimeResult<{ value: string | null }>> {
    return unsupported("secure-storage");
  }

  async secureStorageSet(
    _request: SecureStorageSetRequest,
  ): Promise<KxdRuntimeResult<{ stored: true }>> {
    return unsupported("secure-storage");
  }

  async secureStorageDelete(
    _request: SecureStorageDeleteRequest,
  ): Promise<KxdRuntimeResult<{ deleted: true }>> {
    return unsupported("secure-storage");
  }

  async checkForUpdate(): Promise<
    KxdRuntimeResult<{ available: boolean; version?: string }>
  > {
    return unsupported("updater");
  }
}
