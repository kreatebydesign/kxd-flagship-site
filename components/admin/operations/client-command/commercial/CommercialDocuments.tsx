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
        <div className="kxd-os-commercial-doc-grid kxd-os-commercial-doc-grid--wide">
          {rows.map((row) => (
            <article key={row.id} className="kxd-os-commercial-doc-card">
              <div className="kxd-os-commercial-doc-card__top">
                <span className="kxd-os-commercial-doc-card__type">{row.kindLabel}</span>
                <CommercialStatusBadge label={row.status} tone={statusTone(row.status)} />
              </div>
              <h3 className="kxd-os-commercial-doc-card__title">{row.title}</h3>
              <p className="kxd-os-commercial-doc-card__date">
                v{row.version}
                {" · "}
                {row.generatedAt ? fmtWorkspaceDate(row.generatedAt) : "—"}
                {row.agreementTitle ? ` · ${row.agreementTitle}` : ""}
              </p>
              <div className="kxd-os-commercial-doc-card__actions">
                <button
                  type="button"
                  className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                  onClick={() => setPreviewId(previewId === row.id ? null : row.id)}
                >
                  {previewId === row.id ? "Hide preview" : "Preview"}
                </button>
                <a
                  href={row.downloadHref}
                  className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                >
                  Download
                </a>
                {row.contractId ? (
                  <Link
                    href={`/admin/operations/client-command/${data.clientId}/commercial/agreements/${row.contractId}#documents`}
                    className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                  >
                    Version history
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
