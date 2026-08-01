import { Suspense } from "react";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalActivateForm } from "@/components/portal/PortalActivateForm";

export default function PortalActivatePage() {
  return (
    <PortalAuthShell
      title="Activate your workspace"
      lead="This private invitation is personal to you. Set a password to continue — Face ID, Touch ID, or Windows Hello may be available on supported devices during security setup. KXD never stores biometric data."
    >
      <Suspense fallback={null}>
        <PortalActivateForm />
      </Suspense>
    </PortalAuthShell>
  );
}
