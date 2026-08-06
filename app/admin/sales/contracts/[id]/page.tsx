import { notFound, redirect } from "next/navigation";
import { getContractLifecycle } from "@/lib/proposal-lifecycle/services";
import { commercialAgreementHref } from "@/lib/client-command/commercial/sections";

export const dynamic = "force-dynamic";

/**
 * Legacy sales contract URL — operators land in the client Commercial agreement workspace.
 */
export default async function ContractLifecycleWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!id) notFound();

  let contract;
  try {
    ({ contract } = await getContractLifecycle(id));
  } catch {
    notFound();
  }

  const clientId =
    typeof contract.client === "object" && contract.client && "id" in contract.client
      ? Number((contract.client as { id: number }).id)
      : Number(contract.client);

  if (!clientId || !Number.isFinite(clientId)) {
    notFound();
  }

  redirect(commercialAgreementHref(clientId, id));
}
