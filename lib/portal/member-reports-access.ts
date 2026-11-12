/**
 * Per-member Reports access — client-specific allowlists (configuration only).
 * Fails closed on configured clients when email is not allowlisted.
 */

import {
  PRIMAL_CLIENT_SLUG,
  PRIMAL_REPORTS_MEMBER_EMAILS,
} from "@/lib/ces/profile/primal";
import { normalizePortalEmail } from "@/lib/portal/identity/crypto";

export function canPortalMemberAccessReports(input: {
  clientSlug?: string | null;
  portalUserEmail?: string | null;
  isOperatorPreview?: boolean;
}): boolean {
  if (input.isOperatorPreview) return true;

  const slug = input.clientSlug?.trim().toLowerCase() ?? "";
  if (slug !== PRIMAL_CLIENT_SLUG) return true;

  const email = normalizePortalEmail(input.portalUserEmail ?? "");
  if (!email) return false;

  return PRIMAL_REPORTS_MEMBER_EMAILS.some(
    (allowed) => normalizePortalEmail(allowed) === email,
  );
}

export type PrimalLeadershipPrintAuthInput = {
  portalSession: {
    email: string;
    isOperatorPreview: boolean;
    clientSlug: string | null;
    accessMode: "client" | "partner";
  } | null;
  /** Authenticated Payload `users` studio operator (KXD OS admin). */
  studioOperatorAuthenticated: boolean;
};

/**
 * Authorization for /primal-leadership-progress-print and equivalent HTML print surfaces.
 * No report markup should render before this returns true.
 */
export function canAccessPrimalLeadershipProgressPrint(
  input: PrimalLeadershipPrintAuthInput,
): boolean {
  if (input.studioOperatorAuthenticated) return true;

  const session = input.portalSession;
  if (!session) return false;
  if (session.isOperatorPreview) return true;
  if (session.accessMode === "partner") return false;

  return canPortalMemberAccessReports({
    clientSlug: session.clientSlug,
    portalUserEmail: session.email,
    isOperatorPreview: false,
  });
}

export function applyPortalMemberReportsVisibility(
  moduleId: string,
  input: {
    clientSlug?: string | null;
    portalUserEmail?: string | null;
    isOperatorPreview?: boolean;
  },
): boolean {
  if (moduleId !== "reports") return true;
  // Client-level visibility checks may omit the member email; session routes use
  // isPortalReportsSurfaceAvailable + canPortalMemberAccessReports explicitly.
  if (!input.portalUserEmail?.trim()) return true;
  return canPortalMemberAccessReports(input);
}
