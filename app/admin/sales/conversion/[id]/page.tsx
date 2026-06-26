import { notFound } from "next/navigation";
import { ConversionWizardScreen } from "@/components/admin/sales/ConversionWizardScreen";
import { conversionDraftToWizard, getConversionWizardData } from "@/lib/sales/acquisition";

export const dynamic = "force-dynamic";

export default async function SalesConversionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getConversionWizardData(Number(id));
  if (!data) notFound();

  const draft = data.proposal.conversionDraft
    ? conversionDraftToWizard(data.proposal.conversionDraft)
    : data.draft;

  return (
    <ConversionWizardScreen
      proposalId={Number(id)}
      proposalTitle={String(data.proposal.title ?? "Proposal")}
      initialDraft={draft}
      conversionExecuted={Boolean(data.proposal.conversionExecutedAt)}
    />
  );
}
