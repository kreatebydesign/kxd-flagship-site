import { notFound } from "next/navigation";
import Link from "next/link";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { renderProposalPreviewHtml } from "@/lib/proposal-builder/export-html";
import { getProposal, previewCanonical } from "@/lib/proposal-builder/services";

export const dynamic = "force-dynamic";

export default async function ProposalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!id) notFound();
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  const canonical = previewCanonical(proposal);
  const html = renderProposalPreviewHtml(canonical);

  return (
    <OperationsShell activeId="sales-proposals">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Preview"
          title={String(proposal.title ?? "Proposal")}
          lead="Internal preview of the client-facing proposal. Internal notes and margin data are excluded."
        />
        <KxdSection>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <Link href={`/admin/sales/proposals/${id}`} className="kxd-os-btn kxd-os-btn--ghost" style={{ borderRadius: 2 }}>
              Back to editor
            </Link>
            <a href={`/api/admin/proposal-builder/${id}/pdf`} className="kxd-os-btn" style={{ borderRadius: 2 }}>
              Download PDF
            </a>
          </div>
          <iframe
            title="Proposal preview"
            srcDoc={html}
            style={{
              width: "100%",
              minHeight: "80vh",
              border: "1px solid var(--kxd-os-line, #e2d8c8)",
              borderRadius: 2,
              background: "#fff",
            }}
          />
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
