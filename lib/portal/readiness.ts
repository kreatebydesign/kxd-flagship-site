import { PRIMAL_CLIENT_SLUG } from "@/lib/ces/profile/primal";

export type PortalReadinessIssueLevel = "blocker" | "warning" | "info";

export type CesProfileStatus = "active" | "draft" | "archived" | "none";

export interface PortalReadinessIssue {
  id: string;
  level: PortalReadinessIssueLevel;
  message: string;
}

export interface PortalClientReadinessInput {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  websiteUrl: string | null;
  portalUserCount: number;
  activePortalUserCount: number;
  cesProfileStatus: CesProfileStatus;
  cesProfileName: string | null;
  cesModules: string[];
  accentColor: string | null;
}

export interface PortalReadinessEnv {
  resendConfigured: boolean;
  isProduction: boolean;
}

export interface PortalClientReadinessResult {
  ready: boolean;
  issues: PortalReadinessIssue[];
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function evaluatePortalClientReadiness(
  client: PortalClientReadinessInput,
  env: PortalReadinessEnv,
): PortalClientReadinessResult {
  const issues: PortalReadinessIssue[] = [];
  const websiteReviewEnabled = client.cesModules.includes("website-review");

  if (client.cesProfileStatus === "none") {
    issues.push({
      id: "ces-missing",
      level: "blocker",
      message: "No Client Experience Profile — run seed:primal-experience or create one in Payload.",
    });
  } else if (client.cesProfileStatus === "draft") {
    issues.push({
      id: "ces-draft",
      level: "blocker",
      message: "CES profile is draft — set status to Active before client login.",
    });
  } else if (client.cesProfileStatus === "archived") {
    issues.push({
      id: "ces-archived",
      level: "blocker",
      message: "CES profile is archived — restore Active status before client login.",
    });
  }

  if (client.cesProfileStatus === "active" && !websiteReviewEnabled) {
    issues.push({
      id: "module-disabled",
      level: "blocker",
      message: "Website Review is not enabled on the active CES profile.",
    });
  }

  if (!client.websiteUrl?.trim()) {
    issues.push({
      id: "website-missing",
      level: "blocker",
      message: "Company website URL is missing — Visual Review iframe will not load.",
    });
  }

  if (client.activePortalUserCount === 0) {
    issues.push({
      id: "no-portal-users",
      level: "warning",
      message: "No active portal users — create Adam and Tyler in Portal Access before go-live.",
    });
  }

  if (env.isProduction && !env.resendConfigured) {
    issues.push({
      id: "resend-missing",
      level: "warning",
      message: "RESEND_API_KEY is not set — password reset emails will not send in production.",
    });
  }

  if (client.cesProfileStatus === "active" && websiteReviewEnabled && client.websiteUrl) {
    issues.push({
      id: "portal-ready-core",
      level: "info",
      message: "Core portal experience is configured — create portal users to complete go-live.",
    });
  }

  const blockers = issues.filter((issue) => issue.level === "blocker");
  const ready = blockers.length === 0;

  return { ready, issues };
}

export function isPrimalProductionCandidate(clientSlug: string | null): boolean {
  return clientSlug === PRIMAL_CLIENT_SLUG;
}
