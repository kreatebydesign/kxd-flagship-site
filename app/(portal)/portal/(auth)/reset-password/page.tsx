import { Suspense } from "react";
import { PortalResetPasswordForm } from "@/components/portal/PortalResetPasswordForm";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export default function PortalResetPasswordPage() {
  return (
    <PortalAuthShell
      title={PORTAL_CLIENT_LANGUAGE.authResetTitle}
      lead={PORTAL_CLIENT_LANGUAGE.authResetLead}
    >
      <Suspense fallback={null}>
        <PortalResetPasswordForm />
      </Suspense>
    </PortalAuthShell>
  );
}
