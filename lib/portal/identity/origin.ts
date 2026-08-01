/**
 * Same-origin guard for portal mutating APIs (activate, security, account switch).
 */

import { resolveWebAuthnAllowedOrigins } from "./webauthn-config";

export function resolveRequestOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const referer = req.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function assertPortalMutatingOrigin(req: Request): {
  ok: true;
  origin: string;
} | { ok: false; status: 403; message: string } {
  const origin = resolveRequestOrigin(req);
  if (!origin) {
    // Same-site navigations without Origin (e.g. some browsers) — allow when Host matches.
    const host = req.headers.get("host")?.split(":")[0]?.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "portal.kreatebydesign.com") {
      const proto =
        req.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production"
          ? "https"
          : "http";
      const inferred =
        host === "localhost" || host === "127.0.0.1"
          ? `${proto === "https" && host === "localhost" ? "http" : "http"}://${host}:3000`
          : `https://${host}`;
      // Prefer configured allowed origin matching host
      const match = resolveWebAuthnAllowedOrigins().find((o) => {
        try {
          return new URL(o).hostname === host;
        } catch {
          return false;
        }
      });
      return { ok: true, origin: match ?? inferred };
    }
    return { ok: false, status: 403, message: "Invalid request origin." };
  }
  if (!resolveWebAuthnAllowedOrigins().includes(origin)) {
    return { ok: false, status: 403, message: "Invalid request origin." };
  }
  return { ok: true, origin };
}
