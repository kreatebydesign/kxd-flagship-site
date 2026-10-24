"use client";

import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsCard, OpsEmpty, OpsSectionHead, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import { KxdPage } from "@/components/os";
import "@/design-system/os/styles/kxd-staff-documents.css";
import {
  formatStaffDocumentListDate,
  staffDocumentAssignmentNextAction,
  staffDocumentEmployeeReviewAction,
  staffDocumentKindLabel,
  staffDocumentStatusBadge,
} from "@/lib/staff-documents/display";
import type { StaffDocumentListItem } from "@/lib/staff-documents/types";

function needsAttention(doc: StaffDocumentListItem): boolean {
  return doc.status === "assigned";
}

function StaffDocumentListRow(props: {
  doc: StaffDocumentListItem;
  emphasizeAction?: boolean;
}) {
  const { doc, emphasizeAction } = props;
  const badge = staffDocumentStatusBadge({
    status: doc.status,
    signingMode: doc.signingMode,
  });
  const reviewAction = staffDocumentEmployeeReviewAction({
    status: doc.status,
    signingMode: doc.signingMode,
  });
  const statusLine = emphasizeAction
    ? badge.label
    : staffDocumentAssignmentNextAction({
        status: doc.status,
        signingMode: doc.signingMode,
      });

  return (
    <li
      className={
        emphasizeAction
          ? "kxd-staff-doc-list__item kxd-staff-doc-list__item--attention"
          : "kxd-staff-doc-list__item"
      }
    >
      <Link href={doc.href} className="kxd-staff-doc-list__link">
        <div className="kxd-staff-doc-list__main">
          <p className="kxd-staff-doc-list__title">{doc.title}</p>
          <p className="kxd-staff-doc-list__meta">
            <span>{staffDocumentKindLabel(doc.kind)}</span>
            <span aria-hidden="true">·</span>
            <span>Version {doc.templateVersion}</span>
            <span aria-hidden="true">·</span>
            <span>Assigned {formatStaffDocumentListDate(doc.assignedAt)}</span>
            {!emphasizeAction && doc.acknowledgedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Acknowledged {formatStaffDocumentListDate(doc.acknowledgedAt)}</span>
              </>
            ) : null}
            {!emphasizeAction && doc.executedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Executed {formatStaffDocumentListDate(doc.executedAt)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="kxd-staff-doc-list__aside">
          <OpsStatusBadge label={statusLine} variant={badge.variant} />
          {emphasizeAction && reviewAction ? (
            <span className="kxd-staff-doc-list__cta">{reviewAction}</span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export function StaffDocumentsScreen(props: { documents: StaffDocumentListItem[] }) {
  const pending = props.documents.filter(needsAttention);
  const pendingIds = new Set(pending.map((doc) => doc.id));
  const onFile = props.documents.filter((doc) => !pendingIds.has(doc.id));

  return (
    <OperationsShell activeId="staff-documents" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <OperationsPageHero
          eyebrow="My documents"
          title="Policies and agreements"
          lead="Assigned internal policies and employment documents. Open each item to review the full text before acknowledging or signing."
        />

        {pending.length > 0 ? (
          <section style={{ marginBottom: "1.35rem" }} aria-label="Needs your attention">
            <OpsSectionHead label="Needs your attention" count={pending.length} />
            <OpsCard>
              <ul className="kxd-staff-doc-list">
                {pending.map((doc) => (
                  <StaffDocumentListRow key={doc.id} doc={doc} emphasizeAction />
                ))}
              </ul>
            </OpsCard>
          </section>
        ) : null}

        <OpsSectionHead
          label={pending.length > 0 ? "On file" : "All documents"}
          count={onFile.length}
        />
        <OpsCard>
          {props.documents.length === 0 ? (
            <OpsEmpty message="No documents assigned yet." />
          ) : onFile.length === 0 ? (
            <OpsEmpty message="No completed documents yet — finish the items above first." />
          ) : (
            <ul className="kxd-staff-doc-list">
              {onFile.map((doc) => (
                <StaffDocumentListRow key={doc.id} doc={doc} />
              ))}
            </ul>
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
