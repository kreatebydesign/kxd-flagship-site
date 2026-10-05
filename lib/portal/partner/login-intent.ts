/**
 * Gated Partner Network login presentation.
 * Client-safe: no server-only imports. Does not change session or routing rules.
 */
export const PARTNER_NETWORK_LOGIN = {
  eyebrow: "KXD Network · Private access",
  title: "Sign in to your partner room.",
  lead:
    "You bring the introduction. KXD qualifies, discovers, and closes.",
} as const;

/** Safe partner return-to used to gate the login variant. */
export function isPartnerLoginRedirect(
  raw: string | string[] | null | undefined,
): boolean {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== "string") return false;
  if (value.includes("://") || value.startsWith("//")) return false;
  const path = value.split("?")[0]?.split("#")[0] ?? "";
  return path === "/portal/partner" || path.startsWith("/portal/partner/");
}
