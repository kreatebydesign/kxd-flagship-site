/**
 * Preview Domain Manager — Shared Core helpers.
 *
 * Permanent client preview websites are stored on
 * `client-infrastructure.stagingUrl` (field name retained for compatibility).
 * UI labels use "Preview Website".
 *
 * Pattern: {slug}.preview.kreatebydesign.com
 * Resolution is data-driven — no per-client code.
 */

import "server-only";

import type { Payload } from "payload";
import type { PreviewHealthStatus } from "./preview-domain-types";

export type { PreviewHealthStatus } from "./preview-domain-types";

export type PreviewHealthResult = {
  status: PreviewHealthStatus;
  httpStatus: number | null;
  verifiedAt: string;
  message: string;
  url: string;
};

const HEALTH_TIMEOUT_MS = 6_000;

/** Trim and empty → null. Does not rewrite scheme. */
export function trimPreviewWebsiteInput(raw: unknown): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

/**
 * Canonical comparison form for duplicate detection:
 * lowercase origin + path, no trailing slash, no hash/query.
 */
export function normalizePreviewWebsiteForCompare(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.protocol}//${url.host.toLowerCase()}${path}`;
  } catch {
    return null;
  }
}

/**
 * Validate Preview Website input.
 * Requires https, a parseable URL, and no credentials.
 */
export function validatePreviewWebsiteUrl(
  raw: string | null | undefined,
): { ok: true; url: string } | { ok: false; message: string } {
  const trimmed = trimPreviewWebsiteInput(raw);
  if (!trimmed) {
    return { ok: true, url: "" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, message: "Preview Website must be a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, message: "Preview Website must use https." };
  }

  if (!parsed.hostname) {
    return { ok: false, message: "Preview Website must be a valid URL." };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      message: "Preview Website URLs cannot include credentials.",
    };
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  const canonical = path ? `${parsed.origin}${path}` : parsed.origin;
  return { ok: true, url: canonical };
}

export async function findDuplicatePreviewWebsite(
  payload: Payload,
  previewUrl: string,
  excludeInfraId?: number | string | null,
): Promise<{ id: number; clientId: number | null } | null> {
  const needle = normalizePreviewWebsiteForCompare(previewUrl);
  if (!needle) return null;

  let page = 1;
  const limit = 100;

  while (page < 50) {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      limit,
      page,
      depth: 0,
      overrideAccess: true,
    });

    for (const doc of result.docs as Array<{
      id: number;
      stagingUrl?: string | null;
      client?: unknown;
    }>) {
      if (excludeInfraId != null && String(doc.id) === String(excludeInfraId)) {
        continue;
      }
      const other = normalizePreviewWebsiteForCompare(String(doc.stagingUrl ?? ""));
      if (!other || other !== needle) continue;

      let clientId: number | null = null;
      if (typeof doc.client === "number") clientId = doc.client;
      else if (
        typeof doc.client === "object" &&
        doc.client !== null &&
        "id" in doc.client
      ) {
        const id = Number((doc.client as { id: unknown }).id);
        clientId = Number.isFinite(id) ? id : null;
      }

      return { id: doc.id, clientId };
    }

    if (!result.hasNextPage) break;
    page += 1;
  }

  return null;
}

/**
 * Lightweight preview reachability check.
 * Uses HEAD first, falls back to GET. Does not follow redirects (manual).
 */
export async function checkPreviewWebsiteHealth(
  rawUrl: string,
): Promise<PreviewHealthResult> {
  const verifiedAt = new Date().toISOString();
  const validated = validatePreviewWebsiteUrl(rawUrl);
  if (!validated.ok || !validated.url) {
    return {
      status: "unreachable",
      httpStatus: null,
      verifiedAt,
      message: validated.ok ? "No Preview Website configured." : validated.message,
      url: rawUrl,
    };
  }

  const url = validated.url;

  async function probe(method: "HEAD" | "GET"): Promise<Response> {
    return fetch(url, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      headers: {
        "User-Agent": "KXD-Preview-Health/1.0",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      cache: "no-store",
    });
  }

  try {
    let res: Response;
    try {
      res = await probe("HEAD");
      // Some hosts reject HEAD — retry with GET.
      if (res.status === 405 || res.status === 501) {
        res = await probe("GET");
      }
    } catch {
      res = await probe("GET");
    }

    const httpStatus = res.status;
    if (httpStatus >= 300 && httpStatus < 400) {
      return {
        status: "redirecting",
        httpStatus,
        verifiedAt,
        message: `Redirecting (${httpStatus})`,
        url,
      };
    }
    if (httpStatus >= 200 && httpStatus < 300) {
      return {
        status: "reachable",
        httpStatus,
        verifiedAt,
        message: `Reachable (${httpStatus})`,
        url,
      };
    }
    return {
      status: "unreachable",
      httpStatus,
      verifiedAt,
      message: `Unreachable (${httpStatus})`,
      url,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "Unreachable (timed out)"
        : "Unreachable";
    return {
      status: "unreachable",
      httpStatus: null,
      verifiedAt,
      message,
      url,
    };
  }
}

export function previewWebsiteConfigured(raw: unknown): boolean {
  return Boolean(trimPreviewWebsiteInput(raw));
}
