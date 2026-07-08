/**
 * Client Launch Readiness — validation rules.
 * Payload-safe (no server-only) for CLI scripts, hooks, and admin routes.
 */

import type {
  CesProfileStatus,
  ClientLaunchReadinessInput,
  LaunchBlocker,
  LaunchBlockerLevel,
  LaunchReadinessEnv,
} from "./types";

const WEBSITE_REVIEW_MODULE = "website-review";

function issue(
  id: string,
  level: LaunchBlockerLevel,
  message: string,
  checklistStepId?: LaunchBlocker["checklistStepId"],
): LaunchBlocker {
  return { id, level, message, checklistStepId };
}

export function validateClientRecord(input: ClientLaunchReadinessInput): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];

  if (!input.clientName?.trim()) {
    blockers.push(
      issue(
        "client-name-missing",
        "blocker",
        "Client name is missing — create or update the client record.",
        "client-created",
      ),
    );
  }

  if (input.clientStatus && input.clientStatus !== "active") {
    blockers.push(
      issue(
        "client-inactive",
        "blocker",
        `Client status is "${input.clientStatus}" — set to Active before portal go-live.`,
        "client-created",
      ),
    );
  }

  return blockers;
}

export function validateCesProfile(input: ClientLaunchReadinessInput): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];
  const status = input.cesProfileStatus;

  if (status === "none") {
    blockers.push(
      issue(
        "ces-missing",
        "blocker",
        "No Client Experience Profile — create one in Payload or run the CES profile seed for this client.",
        "workspace-configured",
      ),
    );
    return blockers;
  }

  if (status === "draft") {
    blockers.push(
      issue(
        "ces-draft",
        "blocker",
        "CES profile is draft — set status to Active before client login.",
        "workspace-configured",
      ),
    );
  } else if (status === "archived") {
    blockers.push(
      issue(
        "ces-archived",
        "blocker",
        "CES profile is archived — restore Active status before client login.",
        "workspace-configured",
      ),
    );
  }

  if (status === "active" && input.cesModules.length === 0) {
    blockers.push(
      issue(
        "modules-empty",
        "blocker",
        "No CES modules enabled — enable at least one module (e.g. Website Review).",
        "modules-enabled",
      ),
    );
  }

  if (status === "active" && !input.accentColor?.trim()) {
    blockers.push(
      issue(
        "accent-missing",
        "warning",
        "Brand accent color is missing — portal will use default styling.",
        "workspace-configured",
      ),
    );
  }

  return blockers;
}

export function validatePortalUsers(input: ClientLaunchReadinessInput): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];

  if (input.activePortalUserCount === 0) {
    blockers.push(
      issue(
        "no-portal-users",
        "warning",
        "No active portal users — create client contacts in Portal Access before go-live.",
        "portal-access-created",
      ),
    );
  }

  if (
    input.activePortalUserCount > 0 &&
    input.welcomePendingUserCount > 0
  ) {
    blockers.push(
      issue(
        "welcome-pending",
        "warning",
        `${input.welcomePendingUserCount} active portal user(s) have not completed the welcome flow.`,
        "welcome-complete",
      ),
    );
  }

  return blockers;
}

export function validateReviewModule(input: ClientLaunchReadinessInput): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];
  const websiteReviewEnabled =
    input.cesProfileStatus === "active" &&
    input.cesModules.includes(WEBSITE_REVIEW_MODULE);

  if (!websiteReviewEnabled) {
    return blockers;
  }

  if (!input.websiteUrl?.trim()) {
    blockers.push(
      issue(
        "website-missing",
        "blocker",
        "Company website URL is missing — Visual Review iframe will not load.",
        "review-ready",
      ),
    );
  }

  return blockers;
}

export function validateLaunchEnvironment(env: LaunchReadinessEnv): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];

  if (env.isProduction && !env.resendConfigured) {
    blockers.push(
      issue(
        "resend-missing",
        "warning",
        "RESEND_API_KEY is not set — password reset emails will not send in production.",
      ),
    );
  }

  return blockers;
}

export function collectLaunchBlockers(
  input: ClientLaunchReadinessInput,
  env: LaunchReadinessEnv,
): LaunchBlocker[] {
  return [
    ...validateClientRecord(input),
    ...validateCesProfile(input),
    ...validatePortalUsers(input),
    ...validateReviewModule(input),
    ...validateLaunchEnvironment(env),
  ];
}

export function hasLaunchBlockers(
  blockers: LaunchBlocker[],
  level: LaunchBlockerLevel = "blocker",
): boolean {
  return blockers.some((blocker) => blocker.level === level);
}

export function normalizeCesProfileStatus(value: unknown): CesProfileStatus {
  if (value === "active" || value === "draft" || value === "archived") return value;
  return "none";
}
