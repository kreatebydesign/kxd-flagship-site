import type { Metadata } from "next";
import { PublicProposalExperience } from "@/components/proposal/PublicProposalExperience";
import { PublicProposalBuilderExperience } from "@/components/proposal/PublicProposalBuilderExperience";
import { getPublicProposalByToken } from "@/lib/proposal-builder/services";
import { getProposalByPublicToken } from "@/lib/sales/public";

export const dynamic = "force-dynamic";

function ProposalUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.25rem" }}>
      <p style={{ letterSpacing: 0.08, textTransform: "uppercase", fontSize: 12, opacity: 0.65 }}>
        Proposal
      </p>
      <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500 }}>{title}</h1>
      <p style={{ lineHeight: 1.55, opacity: 0.85 }}>{message}</p>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}): Promise<Metadata> {
  const { publicToken } = await params;
  const builder = await getPublicProposalByToken(publicToken);
  if (builder) {
    return {
      title: `${builder.canonical.title} · KXD Proposal`,
      robots: { index: false, follow: false },
    };
  }
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
  if (!publicToken || publicToken.length < 16) {
    return (
      <ProposalUnavailable
        title="Proposal unavailable"
        message="This proposal link is invalid or incomplete."
      />
    );
  }

  const builder = await getPublicProposalByToken(publicToken);
  if (builder) {
    return <PublicProposalBuilderExperience publicToken={publicToken} />;
  }

  const view = await getProposalByPublicToken(publicToken);
  if (!view) {
    return (
      <ProposalUnavailable
        title="Proposal unavailable"
        message="This proposal link is invalid, expired, revoked, or no longer available."
      />
    );
  }

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
