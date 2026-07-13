/**
 * Phase 30B — File / download contract.
 * No unrestricted filesystem access.
 */

import { runtimeFail, runtimeOk, type KxdRuntimeResult } from "./errors";

export type DownloadRequest = {
  /** Absolute https URL or same-origin path. */
  url: string;
  filename?: string;
  /** Optional MIME allowlist; empty = no restriction beyond transport. */
  allowedMimeTypes?: string[];
  /** Credentials: include for authenticated same-origin downloads. */
  credentials?: RequestCredentials;
};

export type DownloadHandle = {
  id: string;
  filename: string;
  status: "started" | "completed" | "cancelled" | "failed";
  /** Browser: blob object URL when completed; native: opaque local ref later. */
  localRef?: string;
  bytesReceived?: number;
  cancel?: () => void;
};

export type OpenFileRequest = {
  accept?: string;
  multiple?: boolean;
};

export type OpenFileResult = {
  files: Array<{
    name: string;
    size: number;
    type: string;
    /** Opaque handle — never a raw OS path in web. */
    handleId: string;
  }>;
};

export type SaveFileRequest = {
  filename: string;
  mimeType: string;
  /** UTF-8 text or base64 for binary in contract phase. */
  data: string;
  encoding: "utf-8" | "base64";
};

export type SaveFileResult = {
  filename: string;
  saved: true;
  localRef?: string;
};

const UNSAFE_FILENAME = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Take the final path segment only — neutralize absolute / traversal names.
 */
function basenameOnly(input: string): string {
  const normalized = input.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? "";
}

/**
 * Sanitize a download/save filename. Never trust caller input.
 * MIME validation must not rely on extension alone (see isMimeAllowed).
 */
export function sanitizeFilename(
  input: string,
  fallback = "download",
): string {
  let name = basenameOnly(input).trim().normalize("NFC");
  name = name.replace(UNSAFE_FILENAME, "_");
  name = name.replace(/^\.+/, "");
  name = name.replace(/\s+/g, " ");
  if (!name || name === "." || name === "..") name = fallback;
  const base = name.includes(".")
    ? name.slice(0, name.lastIndexOf("."))
    : name;
  if (RESERVED_WINDOWS.test(base)) {
    name = `_${name}`;
  }
  if (name.length > 180) {
    const extIdx = name.lastIndexOf(".");
    if (extIdx > 0 && name.length - extIdx <= 12) {
      const ext = name.slice(extIdx);
      name = `${name.slice(0, 180 - ext.length)}${ext}`;
    } else {
      name = name.slice(0, 180);
    }
  }
  return name;
}

export function validateDownloadUrl(url: string): KxdRuntimeResult<{ url: string }> {
  const trimmed = url.trim();
  if (!trimmed) {
    return runtimeFail("invalid-input", "Download URL is required.");
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return runtimeOk({ url: trimmed });
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return runtimeFail("invalid-input", "Download URL is not valid.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return runtimeFail(
      "invalid-input",
      "Download URL must use http(s).",
      { details: { protocol: parsed.protocol } },
    );
  }

  return runtimeOk({ url: parsed.toString() });
}

/**
 * MIME allowlist check. Does not trust filename extension.
 */
export function isMimeAllowed(
  mime: string | null | undefined,
  allowed?: string[],
): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!mime) return false;
  const normalized = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return allowed.some((a) => {
    const rule = a.trim().toLowerCase();
    if (rule.endsWith("/*")) {
      const prefix = rule.slice(0, -1);
      return normalized.startsWith(prefix);
    }
    return normalized === rule;
  });
}
