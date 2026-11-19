/**
 * KXD Signature Experience — per-client, per-tab session marking.
 * Presentation only; does not gate auth or API calls.
 */

import { KXD_SIGNATURE_EXPERIENCE_DURATION_MS } from "./brand-signature";

export const KXD_SIGNATURE_STORAGE_PREFIX = "kxd-signature-experience-v2";

export function signatureStorageKey(clientId: number): string {
  return `${KXD_SIGNATURE_STORAGE_PREFIX}:c${clientId}`;
}

/** @deprecated Use signatureStorageKey — kept for verification scripts. */
export const KXD_PORTAL_INTRO_SESSION_KEY = KXD_SIGNATURE_STORAGE_PREFIX;

export function hasSeenSignature(clientId: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(signatureStorageKey(clientId)) === "1";
  } catch {
    return true;
  }
}

export function markSignatureSeen(clientId: number): void {
  try {
    sessionStorage.setItem(signatureStorageKey(clientId), "1");
  } catch {
    /* private mode */
  }
}

export function prefersReducedSignatureMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function clearSignatureVeil(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-kxd-signature", "idle");
  document.documentElement.style.backgroundColor = "";
}

export function armSignatureVeilIfNeeded(clientId: number, enabled: boolean): void {
  if (!enabled || typeof document === "undefined") return;
  if (hasSeenSignature(clientId) || prefersReducedSignatureMotion()) {
    clearSignatureVeil();
    return;
  }
  document.documentElement.setAttribute("data-kxd-signature", "arming");
  document.documentElement.style.backgroundColor = "#030304";
}

/** Hard stop so a failed asset never traps the user. */
export const KXD_SIGNATURE_FAILSAFE_MS = KXD_SIGNATURE_EXPERIENCE_DURATION_MS + 800;

export function shouldPlaySignature(clientId: number, enabled: boolean): boolean {
  if (!enabled) return false;
  if (hasSeenSignature(clientId)) return false;
  if (prefersReducedSignatureMotion()) {
    markSignatureSeen(clientId);
    return false;
  }
  return true;
}