import { notFound } from "next/navigation";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import {
  AuditReportError,
  getAuditReportPreviewHtml,
} from "@/lib/website-audit-report/lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AuditReportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auditId = Number(id);
  await requirePayloadAdminPage(`/admin/operations/audits/${id}/report/preview`);

  if (!Number.isFinite(auditId) || auditId <= 0) notFound();

  let html: string | null = null;
  let errorMessage: string | null = null;

  try {
    const result = await getAuditReportPreviewHtml(auditId);
    html = result.html;
  } catch (err) {
    if (err instanceof AuditReportError && err.status === 404) notFound();
    if (err instanceof AuditReportError) {
      errorMessage = err.message;
    } else {
      throw err;
    }
  }

  if (errorMessage) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1>Preview unavailable</h1>
        <p>{errorMessage}</p>
      </main>
    );
  }

  return (
    <iframe
      title="Website audit report preview"
      srcDoc={html ?? ""}
      style={{
        border: 0,
        width: "100%",
        minHeight: "100vh",
        background: "#080808",
      }}
    />
  );
}
