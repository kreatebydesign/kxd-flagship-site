/** Request-time expiry check (kept out of React render for purity lint). */
export function isSigningLinkExpired(
  expiresAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const exp = Date.parse(expiresAt);
  if (Number.isNaN(exp)) return false;
  return exp < nowMs;
}
