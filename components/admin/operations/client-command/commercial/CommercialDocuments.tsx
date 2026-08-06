"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { CommercialStatusBadge, statusTone } from "./CommercialStatusBadge";

export function CommercialDocuments({ data }: { data: ClientWorkspaceBundle }) {
  const rows = data.commercial.documents;
  const [previewId, setPreviewId] = useState<number | null>(null);

  return (
    <div className="kxd-os-commercial-section">
      {!rows.length ? (
        <WorkspaceEmpty message="No commercial documents filed for this client." />
      ) : (
        <div className="kxd-os-commercial-card-list">
          {rows.map((row) => (
            <article key={row.id} className="kxd-os-commercial-card">
              <div className="kxd-os-commercial-card__main">
                <div className="kxd-os-commercial-card__title-row">
                  <h3 className="kxd-os-commercial-card__title">{row.title}</h3>
                  <CommercialStatusBadge label={row.status} tone={statusTone(row.status)} />
                </div>
                <p className="kxd-os-commercial-card__meta">
                  {row.kindLabel}
                  {" · v"}
                  {row.version}
                  {" · "}
                  {row.generatedAt ? fmtWorkspaceDate(row.generatedAt) : "—"}
                  {row.agreementTitle ? ` · ${row.agreementTitle}` : ""}
                </p>
              </div>
              <div className="kxd-os-commercial-card__actions">
                <button
                  type="button"
                  className="kxd-os-link-quiet"
                  onClick={() => setPreviewId(previewId === row.id ? null : row.id)}
                >
                  {previewId === row.id ? "Hide preview" : "Preview"}
                </button>
                <a href={row.downloadHref} className="kxd-os-link-quiet">
                  Download
                </a>
                {row.contractId ? (
                  <Link
                    href={`/admin/operations/client-command/${data.clientId}/commercial/agreements/${row.contractId}`}
                    className="kxd-os-link-quiet"
                  >
                    Agreement
                  </Link>
                ) : null}
              </div>
              {previewId === row.id ? (
                <div className="kxd-os-commercial-preview">
                  <iframe
                    title={`Preview ${row.title}`}
                    src={row.previewHref}
                    className="kxd-os-commercial-preview__frame"
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
