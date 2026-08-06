import { notFound } from "next/navigation";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { CommercialAgreementDetail } from "@/components/admin/operations/client-command/commercial/CommercialAgreementDetail";
import {
  ensureLifecycleHydrated,
  getContractLifecycle,
} from "@/lib/proposal-lifecycle/services";
import { parseStoredDirectAgreementTerms } from "@/lib/direct-agreement/validate";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

export default async function ClientCommercialAgreementPage({
  params,
}: {
  params: Promise<{ clientId: string; contractId: string }>;
}) {
  const { clientId: clientIdParam, contractId: contractIdParam } = await params;
  const clientId = Number(clientIdParam);
  const contractId = Number(contractIdParam);
  if (!clientId || !contractId) notFound();

  let pkg;
  let contract;
  let proposal;
  let canonical;
  try {
    pkg = await ensureLifecycleHydrated(contractId);
    ({ contract, proposal, canonical } = await getContractLifecycle(contractId));
  } catch {
    notFound();
  }

  const contractClientId =
    typeof contract.client === "object" && contract.client && "id" in contract.client
      ? Number((contract.client as { id: number }).id)
      : Number(contract.client);
  if (contractClientId !== clientId) notFound();

  const payload = await getPayload({ config });
  let clientName = `Client ${clientId}`;
  try {
    const client = (await payload.findByID({
      collection: "clients" as never,
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as { name?: string };
    if (client.name) clientName = String(client.name);
  } catch {
    // keep fallback name
  }

  const issues = pkg.billingReadinessIssues ?? [];
  const blockers = issues
    .filter((i) => i.severity === "blocker")
    .map((b) => ({ code: b.code, message: b.message }));
  const daTerms = parseStoredDirectAgreementTerms(contract.directAgreementTerms);
  const acceptance = proposal?.acceptanceRecord as
    | { name?: string; email?: string }
    | null
    | undefined;

  return (
    <OperationsShell activeId="clients" clientId={clientId}>
      <CommercialAgreementDetail
        clientId={clientId}
        clientName={clientName}
        contractId={contractId}
        title={String(contract.title ?? "Agreement")}
        contractStatus={String(contract.status ?? "draft")}
        agreementSource={contract.agreementSource ? String(contract.agreementSource) : null}
        pkg={pkg}
        daTerms={daTerms}
        blockers={blockers}
        defaultRecipientName={String(
          contract.signerName ?? acceptance?.name ?? canonical?.primaryContact?.name ?? "",
        )}
        defaultRecipientEmail={String(
          contract.signerEmail ??
            acceptance?.email ??
            canonical?.primaryContact?.email ??
            "",
        )}
      />
    </OperationsShell>
  );
}
