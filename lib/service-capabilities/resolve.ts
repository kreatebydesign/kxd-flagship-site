import {
  isPortalModuleId,
  isReportingCapabilityId,
  type PortalModuleId,
} from "@/lib/ces/modules/canonical";
import type { ReportingCapabilityId } from "@/lib/reporting/domain/capabilities";
import { getServiceCapability, isServiceCapabilityId } from "./catalog";
import type {
  ClientServiceAssignmentRecord,
  ResolvedServiceScope,
  ServiceAssignmentSource,
  ServiceAssignmentStatus,
  ServiceCapabilityId,
} from "./types";

export const EMPTY_SERVICE_SCOPE: ResolvedServiceScope = {
  hasAuthoritativeScope: false,
  relationshipLabel: null,
  activeCapabilityIds: [],
  grantedModules: [],
  grantedReporting: [],
  assignments: [],
};

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

export function isActiveAssignment(
  assignment: Pick<ClientServiceAssignmentRecord, "status" | "endedAt">,
  now = Date.now(),
): boolean {
  if (assignment.status !== "active") return false;
  if (assignment.endedAt) {
    const ended = Date.parse(assignment.endedAt);
    if (Number.isFinite(ended) && ended <= now) return false;
  }
  return true;
}

export function planServiceActivation(input: {
  active: Pick<ClientServiceAssignmentRecord, "id" | "source"> | null;
  nextSource: ServiceAssignmentSource;
}):
  | { kind: "create" }
  | { kind: "update"; assignmentId: number }
  | { kind: "supersede"; endAssignmentId: number } {
  if (input.active?.id == null) return { kind: "create" };
  if (input.active.source !== input.nextSource) {
    return { kind: "supersede", endAssignmentId: input.active.id };
  }
  return { kind: "update", assignmentId: input.active.id };
}

export function resolveServiceScope(input: {
  assignments: readonly ClientServiceAssignmentRecord[];
  relationshipLabel?: string | null;
  now?: number;
  /** True when DB rows exist even if capability ids fail closed. */
  hasRecordedAssignments?: boolean;
}): ResolvedServiceScope {
  const now = input.now ?? Date.now();
  const assignments = input.assignments.filter((row) => isServiceCapabilityId(row.capabilityId));
  const active = assignments.filter((row) => isActiveAssignment(row, now));
  const experienceActive = active.filter((row) => {
    const def = getServiceCapability(row.capabilityId);
    return Boolean(def?.affectsExperience);
  });

  const grantedModules: PortalModuleId[] = [];
  const grantedReporting: ReportingCapabilityId[] = [];
  const activeCapabilityIds: ServiceCapabilityId[] = [];

  for (const row of experienceActive) {
    const def = getServiceCapability(row.capabilityId);
    if (!def) continue;
    activeCapabilityIds.push(def.id);
    for (const id of def.grantsModules) {
      if (isPortalModuleId(id) && id !== "advisor") grantedModules.push(id);
    }
    for (const id of def.grantsReporting) {
      if (isReportingCapabilityId(id)) grantedReporting.push(id);
    }
  }

  return {
    hasAuthoritativeScope: assignments.length > 0 || Boolean(input.hasRecordedAssignments),
    relationshipLabel: input.relationshipLabel?.trim() || null,
    activeCapabilityIds: uniqueSorted(activeCapabilityIds),
    grantedModules: uniqueSorted(grantedModules),
    grantedReporting: uniqueSorted(grantedReporting),
    assignments: [...assignments].sort((a, b) => {
      const aTime = a.effectiveAt || "";
      const bTime = b.effectiveAt || "";
      return bTime.localeCompare(aTime);
    }),
  };
}

export function parseAssignmentSource(raw: unknown): ServiceAssignmentSource | null {
  if (raw === "agreement" || raw === "legacy-manual" || raw === "included" || raw === "add-on") {
    return raw;
  }
  return null;
}

export function parseAssignmentStatus(raw: unknown): ServiceAssignmentStatus | null {
  if (raw === "active" || raw === "ended" || raw === "expired") return raw;
  return null;
}
