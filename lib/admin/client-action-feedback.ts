/**
 * Client-side admin action feedback helpers.
 * Safe for "use client" panels — no server-only imports.
 */

import { PAYLOAD_ADMIN_LOGIN_PATH } from "./constants";

/** Default Payload JWT lifetime is 2h — KXD OS operator sessions need longer continuous work. */
export const KXD_ADMIN_TOKEN_EXPIRATION_SECONDS = 60 * 60 * 8; // 8 hours

export function isAdminUnauthorizedResponse(
  status: number,
  body?: { error?: unknown; ok?: unknown; success?: unknown } | null,
): boolean {
  if (status === 401) return true;
  const error = String(body?.error ?? "").trim().toLowerCase();
  return error === "unauthorized" || error === "unauthorized.";
}

export function adminSessionExpiredMessage(): string {
  return "Your admin session expired. Sign in again, then return here to continue — your prior lifecycle progress is preserved.";
}

export function adminLoginHrefWithReturn(returnPath?: string | null): string {
  const path = String(returnPath ?? "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return PAYLOAD_ADMIN_LOGIN_PATH;
  }
  const params = new URLSearchParams({ redirect: path });
  return `${PAYLOAD_ADMIN_LOGIN_PATH}?${params.toString()}`;
}

/**
 * Scroll/focus a status or error node into view when it is outside the viewport.
 * No-ops when already fully visible. Honors prefers-reduced-motion.
 */
export function bringAdminStatusMessageIntoView(
  el: HTMLElement | null | undefined,
): void {
  if (!el || typeof window === "undefined") return;

  const rect = el.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const fullyVisible = rect.top >= 0 && rect.bottom <= viewportHeight;
  if (fullyVisible) {
    if (typeof el.focus === "function") {
      el.focus({ preventScroll: true });
    }
    return;
  }

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  el.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "nearest",
  });

  if (typeof el.focus === "function") {
    el.focus({ preventScroll: true });
  }
}

/** Shared fetch defaults for authenticated admin mutation APIs. */
export function adminFetchInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  };
}
