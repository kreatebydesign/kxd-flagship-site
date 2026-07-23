import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { getPortalSession } from "@/lib/portal/session";

function safePortalRedirect(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/portal")) return "/portal";
  if (value.startsWith("//") || value.includes("://")) return "/portal";
  if (value.startsWith("/portal/login")) return "/portal";
  return value;
}

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const session = await getPortalSession();
  if (session) {
    const params = await searchParams;
    redirect(safePortalRedirect(params.redirect));
  }

  return (
    <PortalAuthShell
      title={PORTAL_CLIENT_LANGUAGE.authLoginTitle}
      lead={PORTAL_CLIENT_LANGUAGE.authLoginLead}
    >
      <Suspense fallback={null}>
        <PortalLoginForm />
      </Suspense>
    </PortalAuthShell>
  );
}
