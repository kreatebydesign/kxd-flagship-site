/**
 * Phase 29C — Structured provider errors (never include secrets).
 */

import type { ReportingProviderError, ReportingProviderStatus } from "./types";

const SECRET_PATTERN =
  /(bearer\s+[a-z0-9\-._~+/]+=*|refresh_token|client_secret|private_key|BEGIN PRIVATE KEY)/i;

export function sanitizeProviderMessage(message: string): string {
  const trimmed = message.trim().slice(0, 280);
  if (SECRET_PATTERN.test(trimmed)) {
    return "Provider error (details redacted).";
  }
  return trimmed.replace(SECRET_PATTERN, "[redacted]");
}

export function providerError(
  code: ReportingProviderStatus,
  message: string,
  opts?: { httpStatus?: number; retryable?: boolean },
): ReportingProviderError {
  return {
    code,
    message: sanitizeProviderMessage(message),
    httpStatus: opts?.httpStatus,
    retryable: opts?.retryable ?? false,
  };
}

export function mapHttpStatusToProviderStatus(
  status: number,
): Extract<
  ReportingProviderStatus,
  "unauthorized" | "forbidden" | "rate-limited" | "temporarily-unavailable" | "invalid-configuration"
> {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate-limited";
  if (status === 400 || status === 404) return "invalid-configuration";
  return "temporarily-unavailable";
}
