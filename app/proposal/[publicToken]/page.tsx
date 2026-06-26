import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProposalExperience } from "@/components/proposal/PublicProposalExperience";
import { getProposalByPublicToken } from "@/lib/sales/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}): Promise<Metadata> {
  const { publicToken } = await params;
  const view = await getProposalByPublicToken(publicToken);
  return {
    title: view ? `${view.proposal.title} · KXD Proposal` : "Proposal",
    robots: { index: false, follow: false },
  };
}

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  const view = await getProposalByPublicToken(publicToken);
  if (!view) notFound();

  return (
    <PublicProposalExperience
      publicToken={publicToken}
      initial={{
        proposal: view.proposal,
        agreement: view.agreement,
        depositAmount: view.depositAmount,
      }}
    />
  );
}
