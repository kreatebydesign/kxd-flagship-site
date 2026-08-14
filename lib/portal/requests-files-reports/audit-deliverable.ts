/**
 * Server-side shaping for portal audit deliverable reports.
 */

import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import {
  buildAuditDeliverableViewModel,
  type AuditDeliverableViewModel,
} from "@/lib/reporting/branded-client/audit-deliverable";
import {
  GOOGLE_ADS_AUDIT_REPAIR_KIND,
  reportKindFromDoc,
} from "@/lib/reporting/branded-client/presentation";
import { assertSnapshotImmutable } from "@/lib/reporting/branded-client/snapshot";
import { stripInternalNotesFromSnapshot } from "@/lib/reporting/branded-client/sanitize";
import type { BrandedReportSnapshot } from "@/lib/reporting/branded-client/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveClientFacingSnapshot(report: AnyDoc): BrandedReportSnapshot | null {
  const approved = report.approvedSnapshot;
  const fingerprint = String(report.approvedFingerprint ?? "");
  if (approved && fingerprint) {
    try {
      assertSnapshotImmutable(approved as BrandedReportSnapshot, fingerprint);
      return stripInternalNotesFromSnapshot(approved as BrandedReportSnapshot);
    } catch {
      // fall through
    }
  }
  if (report.reportData && typeof report.reportData === "object") {
    return stripInternalNotesFromSnapshot(report.reportData as BrandedReportSnapshot);
  }
  return null;
}

export function buildPortalAuditDeliverableViewModel(
  report: AnyDoc,
  profile: ResolvedExperienceProfile,
): AuditDeliverableViewModel | null {
  if (reportKindFromDoc(report) !== GOOGLE_ADS_AUDIT_REPAIR_KIND) {
    return null;
  }

  const snapshot = resolveClientFacingSnapshot(report);
  if (!snapshot) return null;

  const provenance =
    report.dataProvenance && typeof report.dataProvenance === "object"
      ? (report.dataProvenance as Record<string, unknown>)
      : null;

  return buildAuditDeliverableViewModel(snapshot, {
    auditPeriodLabel:
      typeof provenance?.auditPeriodLabel === "string"
        ? provenance.auditPeriodLabel
        : snapshot.period.label,
    repairDateLabel:
      typeof provenance?.repairDate === "string" ? provenance.repairDate : null,
    preparedBy:
      typeof report.preparedBy === "string" && report.preparedBy.trim()
        ? report.preparedBy
        : "Kreate by Design",
    logoUrl: profile.identity.logoUrl,
  });
}
