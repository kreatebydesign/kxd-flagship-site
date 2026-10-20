"use client";

import Link from "next/link";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage } from "@/components/os";
import type { StaffDocumentDetail } from "@/lib/staff-documents/types";
import { StaffDocumentAcknowledgeForm } from "./StaffDocumentAcknowledgeForm";

export function StaffDocumentDetailScreen(props: {
  document: StaffDocumentDetail;
  canAcknowledge: boolean;
}) {
  return (
    <OperationsShell activeId="staff-documents" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <OperationsPageHero
          eyebrow="My documents"
          title={props.document.title}
          lead={`${props.document.legalEntityName} · Version ${props.document.templateVersion}`}
        />
        <StaffDocumentAcknowledgeForm
          document={props.document}
          canAcknowledge={props.canAcknowledge}
        />
        <p className="kxd-os-meta" style={{ marginTop: "1.25rem" }}>
          <Link href="/admin/operations/staff/documents" className="kxd-os-link-quiet">
            All documents
          </Link>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
