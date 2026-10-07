import { Suspense } from "react";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PartnerActivateForm } from "@/components/partner/PartnerActivateForm";
import { PARTNER_NETWORK_LOGIN } from "@/lib/portal/partner/login-intent";

export default function PartnerActivatePage() {
  return (
    <PortalAuthShell
      variant="partner"
      title="Activate your partner room."
      lead={PARTNER_NETWORK_LOGIN.lead}
    >
      <Suspense fallback={null}>
        <PartnerActivateForm />
      </Suspense>
    </PortalAuthShell>
  );
}
