import { Suspense } from "react";
import { PortalForgotPasswordForm } from "@/components/portal/PortalForgotPasswordForm";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export default function PortalForgotPasswordPage() {
  return (
    <PortalAuthShell
      title={PORTAL_CLIENT_LANGUAGE.authForgotTitle}
      lead={PORTAL_CLIENT_LANGUAGE.authForgotLead}
    >
      <Suspense fallback={null}>
        <PortalForgotPasswordForm />
      </Suspense>
    </PortalAuthShell>
  );
}
