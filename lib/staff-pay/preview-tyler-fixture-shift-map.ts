import {
  PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION,
  PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION,
} from "./preview-payroll-qa-fixtures";
import { TYLER_OCT_2026_COVERED_SHIFT_IDS } from "./wage-payments/tyler-oct-2026-fixture";
import type { StaffWagePayableSourceRef } from "./wage-payments/types";

type ShiftAuditRow = {
  id: number;
  audit_events: unknown;
};

function auditMetaFromRow(row: ShiftAuditRow): number | null {
  if (!Array.isArray(row.audit_events)) return null;
  for (const entry of row.audit_events) {
    if (!entry || typeof entry !== "object") continue;
    const action = (entry as { action?: string }).action;
    const version = (entry as { fixtureVersion?: string }).fixtureVersion;
    if (
      action === PREVIEW_TYLER_PAYROLL_QA_FIXTURE_ACTION &&
      version === PREVIEW_TYLER_PAYROLL_QA_FIXTURE_VERSION
    ) {
      const prodId = Number((entry as { sourceProductionShiftId?: number }).sourceProductionShiftId);
      return Number.isFinite(prodId) ? prodId : null;
    }
  }
  return null;
}

/** Map production shift id (1–12) to preview row id via QA fixture audit metadata. */
export function mapProductionShiftIdsToPreviewShiftIds(
  rows: ShiftAuditRow[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of rows) {
    const prodId = auditMetaFromRow(row);
    if (prodId != null) {
      map.set(prodId, row.id);
    }
  }
  return map;
}

export function tylerCoveredShiftAllocationRefsForPreview(
  map: Map<number, number>,
): StaffWagePayableSourceRef[] {
  return TYLER_OCT_2026_COVERED_SHIFT_IDS.map((productionShiftId) => {
    const shiftId = map.get(productionShiftId) ?? productionShiftId;
    return { sourceKind: "time_shift" as const, shiftId };
  });
}

export function resolvePreviewShiftId(
  map: Map<number, number>,
  productionShiftId: number,
): number {
  return map.get(productionShiftId) ?? productionShiftId;
}
