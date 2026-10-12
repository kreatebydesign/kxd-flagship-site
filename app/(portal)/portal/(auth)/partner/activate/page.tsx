import { Suspense } from "react";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PartnerActivateForm } from "@/components/partner/PartnerActivateForm";

export default function PartnerActivatePage() {
  return (
    <PortalAuthShell variant="partner">
      <Suspense
        fallback={<p className="kxd-portal-auth__lead">Checking your invitation…</p>}
      >
        <PartnerActivateForm />
      </Suspense>
    </PortalAuthShell>
  );
}
