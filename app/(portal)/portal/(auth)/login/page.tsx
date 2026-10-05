import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import {
  isPartnerLoginRedirect,
  PARTNER_NETWORK_LOGIN,
} from "@/lib/portal/partner/login-intent";
import { getPortalSession } from "@/lib/portal/session";

function safePortalRedirect(
  raw: string | string[] | undefined,
  accessMode: "client" | "partner",
): string {
  const fallback = accessMode === "partner" ? "/portal/partner" : "/portal";
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/portal")) return fallback;
  if (value.startsWith("//") || value.includes("://")) return fallback;
  if (value.startsWith("/portal/login")) return fallback;
  if (accessMode === "partner" && !value.startsWith("/portal/partner")) {
    return "/portal/partner";
  }
  if (accessMode === "client" && value.startsWith("/portal/partner")) {
    return "/portal";
  }
  return value;
}

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const params = await searchParams;
  const session = await getPortalSession();
  if (session) {
    redirect(
      safePortalRedirect(
        params.redirect,
        session.accessMode === "partner" ? "partner" : "client",
      ),
    );
  }

  const partnerEntry = isPartnerLoginRedirect(params.redirect);

  return (
    <PortalAuthShell
      variant={partnerEntry ? "partner" : "client"}
      title={
        partnerEntry
          ? PARTNER_NETWORK_LOGIN.title
          : PORTAL_CLIENT_LANGUAGE.authLoginTitle
      }
      lead={
        partnerEntry
          ? PARTNER_NETWORK_LOGIN.lead
          : PORTAL_CLIENT_LANGUAGE.authLoginLead
      }
    >
      <Suspense fallback={null}>
        <PortalLoginForm />
      </Suspense>
    </PortalAuthShell>
  );
}
