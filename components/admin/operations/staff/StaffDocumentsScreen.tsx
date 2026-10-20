"use client";

import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsEmpty,
  OpsListRow,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import type { StaffDocumentListItem } from "@/lib/staff-documents/types";

function statusBadge(status: StaffDocumentListItem["status"]) {
  switch (status) {
    case "assigned":
      return { label: "Acknowledgment required", variant: "warning" as const };
    case "acknowledged":
      return { label: "Acknowledged", variant: "success" as const };
    case "revoked":
      return { label: "Revoked", variant: "default" as const };
    default:
      return { label: status, variant: "default" as const };
  }
}

export function StaffDocumentsScreen(props: { documents: StaffDocumentListItem[] }) {
  const pending = props.documents.filter((d) => d.status === "assigned");

  return (
    <OperationsShell activeId="staff-documents" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <OperationsPageHero
          eyebrow="My documents"
          title="Policies and acknowledgments"
          lead="Assigned internal policies. Download the PDF and acknowledge when you have read the full document."
        />

        {pending.length > 0 ? (
          <section style={{ marginBottom: "1.5rem" }} aria-label="Needs your attention">
            <OpsSectionHead label="Needs your attention" count={pending.length} />
            <OpsCard>
              {pending.map((doc) => {
                const badge = statusBadge(doc.status);
                return (
                  <OpsListRow key={doc.id} href={doc.href}>
                    <div className="kxd-os-ops-list-row__main">
                      <div className="kxd-os-ops-list-row__head">
                        <p className="kxd-os-ops-list-row__title">{doc.title}</p>
                        <OpsStatusBadge label={badge.label} variant={badge.variant} />
                      </div>
                      <p className="kxd-os-meta">Assigned {new Date(doc.assignedAt).toLocaleString()}</p>
                    </div>
                  </OpsListRow>
                );
              })}
            </OpsCard>
          </section>
        ) : null}

        <OpsSectionHead label="All documents" count={props.documents.length} />
        <OpsCard>
          {props.documents.length === 0 ? (
            <OpsEmpty message="No documents assigned yet." />
          ) : (
            props.documents.map((doc) => {
              const badge = statusBadge(doc.status);
              return (
                <OpsListRow key={doc.id} href={doc.href}>
                  <div className="kxd-os-ops-list-row__main">
                    <div className="kxd-os-ops-list-row__head">
                      <p className="kxd-os-ops-list-row__title">{doc.title}</p>
                      <OpsStatusBadge label={badge.label} variant={badge.variant} />
                    </div>
                    <p className="kxd-os-meta">
                      Version {doc.templateVersion}
                      {doc.acknowledgedAt
                        ? ` · Acknowledged ${new Date(doc.acknowledgedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                </OpsListRow>
              );
            })
          )}
        </OpsCard>

        <p className="kxd-os-meta" style={{ marginTop: "1.25rem" }}>
          <Link href="/admin/operations/staff" className="kxd-os-link-quiet">
            Back to staff home
          </Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
