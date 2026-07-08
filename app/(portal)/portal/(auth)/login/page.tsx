import { Suspense } from "react";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export default function PortalLoginPage() {
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
