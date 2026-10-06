import { NETWORK_HOST } from "./constants";

export { NETWORK_HOST };

/** Partner login return-to used by the network apex redirect. */
export const NETWORK_ROOT_LOGIN_PATH = "/portal/login?redirect=/portal/partner";

/**
 * Exact `/` on the Partner Network host only.
 * Does not affect kreatebydesign.com, portal.kreatebydesign.com, or any other path.
 */
export function networkRootRedirectPath(
  pathname: string,
  hostHeader: string | null | undefined,
): string | null {
  if (pathname !== "/") return null;
  const host = hostHeader?.split(":")[0]?.toLowerCase();
  if (host !== NETWORK_HOST) return null;
  return NETWORK_ROOT_LOGIN_PATH;
}
