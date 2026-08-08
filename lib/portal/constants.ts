export const PORTAL_SESSION_COOKIE = "kxd-portal-session";
/** HMAC cookie for studio-operator single-client portal preview (not a portal-user session). */
export const OPERATOR_PORTAL_PREVIEW_COOKIE = "kxd-operator-portal-preview";
export const PORTAL_HOST = "portal.kreatebydesign.com";

/** Edge-safe shape check — does not verify HMAC (server session resolver does). */
export function isWellFormedOperatorPortalPreviewCookie(
  value: string | undefined,
): boolean {
  if (!value) return false;
  const [body, sig] = value.split(".");
  if (!body || !sig) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(body)) return false;
  return /^[a-f0-9]{64}$/i.test(sig);
}
