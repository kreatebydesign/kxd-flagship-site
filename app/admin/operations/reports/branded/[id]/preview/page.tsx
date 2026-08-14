import { notFound, redirect } from "next/navigation";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import {
  BrandedReportError,
  getBrandedReportPreviewHtml,
} from "@/lib/reporting/branded-client/lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function BrandedReportClientPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const reportId = Number(id);
  const clientId = Number(sp.clientId);

  if (!Number.isFinite(reportId) || reportId <= 0) {
    redirect("/admin/operations/reports");
  }
  if (!Number.isFinite(clientId) || clientId <= 0) {
    redirect("/admin/operations/reports");
  }

  await requirePayloadAdminPage(
    `/admin/operations/reports/branded/${reportId}/preview?clientId=${clientId}`,
  );

  let html: string | null = null;
  let errorMessage: string | null = null;

  try {
    html = await getBrandedReportPreviewHtml(reportId, clientId, {
      includeInternalNotes: false,
    });
  } catch (err) {
    if (err instanceof BrandedReportError && err.status === 404) notFound();
    if (err instanceof BrandedReportError) {
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
      title="Branded report client presentation preview"
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
