import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getProposalPreviewHtmlForOperator } from "@/lib/proposal-builder/preview-html";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Operator proposal preview — minimal server chrome only.
 * Canonical HTML is rendered on the server and mounted via `srcDoc` on a
 * server-only page (same pattern as branded report preview). Avoids the
 * executive operations client shell, which previously surfaced production
 * server errors for large K&N proposals.
 */
export default async function ProposalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!id) notFound();

  await requirePayloadAdminPage(`/admin/sales/proposals/${id}/preview`);

  const html = await getProposalPreviewHtmlForOperator(id);
  if (!html) notFound();

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || "Proposal";

  return (
    <main
      className="kxd-proposal-operator-preview"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--kxd-os-bg-surface, #f7f3eb)",
      }}
    >
      <header
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--kxd-os-line, #e2d8c8)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            className="kxd-os-meta"
            style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Preview
          </p>
          <h1
            style={{
              margin: "0.25rem 0 0",
              fontFamily: "var(--kxd-os-font-serif, Georgia, serif)",
              fontSize: "1.25rem",
              fontWeight: 500,
            }}
          >
            {title}
          </h1>
          <p className="kxd-os-meta" style={{ margin: "0.35rem 0 0", maxWidth: "42rem" }}>
            Internal preview of the client-facing proposal. Internal notes and margin data are
            excluded.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link
            href={`/admin/sales/proposals/${id}`}
            className="kxd-os-btn kxd-os-btn--ghost"
            style={{ borderRadius: 2 }}
          >
            Back to editor
          </Link>
          <a
            href={`/api/admin/proposal-builder/${id}/pdf`}
            className="kxd-os-btn"
            style={{ borderRadius: 2 }}
          >
            Download PDF
          </a>
        </div>
      </header>
      <iframe
        title="Proposal preview"
        srcDoc={html}
        style={{
          flex: 1,
          width: "100%",
          minHeight: 0,
          border: 0,
          background: "#fff",
        }}
      />
    </main>
  );
}
