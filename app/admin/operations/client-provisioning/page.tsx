import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { ClientProvisioningEngine } from "@/components/admin/operations/client-provisioning/ClientProvisioningEngine";

export const dynamic = "force-dynamic";

export default async function ClientProvisioningPage() {
  await requirePayloadAdminPage("/admin/operations/client-provisioning");

  return (
    <OperationsShell activeId="client-provisioning">
      <ClientProvisioningEngine />
    </OperationsShell>
  );
}
