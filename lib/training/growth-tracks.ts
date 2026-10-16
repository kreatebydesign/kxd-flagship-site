import type { StaffRoleId } from "@/lib/staff/types";
import { EXECUTIVE_OPS_COORDINATOR_TRACK } from "./growth-track";
import type { OperationsGrowthTrack } from "./types";

export const BUSINESS_DEVELOPMENT_SPECIALIST_TRACK: OperationsGrowthTrack = {
  roleTitle: "Business Development & Digital Specialist",
  roleSummary:
    "Represent Kreate by Design with calm authority — prospecting, client communication, digital fundamentals, and creative delivery within assigned client scope.",
  expandingInto: [
    "Lead follow-up",
    "SEO & analytics fundamentals",
    "Creative production support",
    "Website updates",
    "Client confidentiality",
    "Approval workflows",
    "AI-assisted drafting",
  ],
  notIncluded: [
    "Company billing verification",
    "HR / payroll operations",
    "Portfolio-wide coordinator inbox",
    "Unassigned client data",
  ],
};

const COORDINATOR_ROLES: StaffRoleId[] = [
  "operations_coordinator",
  "executive_operations_coordinator",
  "operations_manager",
];

export function resolveGrowthTrackForStaffRole(
  staffRole: StaffRoleId,
): OperationsGrowthTrack {
  if (staffRole === "business_development_specialist") {
    return BUSINESS_DEVELOPMENT_SPECIALIST_TRACK;
  }
  if (COORDINATOR_ROLES.includes(staffRole)) {
    return EXECUTIVE_OPS_COORDINATOR_TRACK;
  }
  return EXECUTIVE_OPS_COORDINATOR_TRACK;
}
