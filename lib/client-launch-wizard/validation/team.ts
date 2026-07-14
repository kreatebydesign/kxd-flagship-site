import { validateEmailFormat } from "./identity";
import type { LaunchWizardTeamMember, LaunchWizardValidationIssue } from "../types";

const ALLOWED_ROLES = new Set(["owner", "collaborator", "viewer"]);

export function validateTeamStep(
  team: readonly LaunchWizardTeamMember[],
  options?: { existingPortalEmails?: readonly string[] },
): LaunchWizardValidationIssue[] {
  const issues: LaunchWizardValidationIssue[] = [];
  const emails = new Map<string, number>();
  const existing = new Set(
    (options?.existingPortalEmails ?? []).map((email) => email.trim().toLowerCase()),
  );

  for (const member of team) {
    const email = member.email.trim().toLowerCase();
    if (!member.name.trim()) {
      issues.push({
        stepId: "team",
        field: member.id,
        code: "team.name.required",
        message: "Every team member needs a name.",
        level: "error",
      });
    }
    if (!email) {
      issues.push({
        stepId: "team",
        field: member.id,
        code: "team.email.required",
        message: "Every team member needs an email.",
        level: "error",
      });
    } else if (!validateEmailFormat(email)) {
      issues.push({
        stepId: "team",
        field: member.id,
        code: "team.email.invalid",
        message: `Invalid email: ${member.email}`,
        level: "error",
      });
    } else {
      emails.set(email, (emails.get(email) ?? 0) + 1);
      if (existing.has(email)) {
        issues.push({
          stepId: "team",
          field: member.id,
          code: "team.email.exists",
          message: `Portal user already exists for ${email}.`,
          level: "error",
        });
      }
    }

    if (!ALLOWED_ROLES.has(member.role)) {
      issues.push({
        stepId: "team",
        field: member.id,
        code: "team.role.invalid",
        message: "Portal roles are limited to owner, collaborator, or viewer.",
        level: "error",
      });
    }

    if (
      member.role === ("admin" as string) ||
      member.role === ("super-admin" as string)
    ) {
      issues.push({
        stepId: "team",
        field: member.id,
        code: "team.role.adminForbidden",
        message: "Internal admin roles cannot be assigned to client portal users.",
        level: "error",
      });
    }
  }

  for (const [email, count] of emails) {
    if (count > 1) {
      issues.push({
        stepId: "team",
        field: email,
        code: "team.email.duplicate",
        message: `Duplicate portal email: ${email}`,
        level: "error",
      });
    }
  }

  const primaryCount = team.filter((m) => m.isPrimaryContact).length;
  if (team.length > 0 && primaryCount === 0) {
    issues.push({
      stepId: "team",
      code: "team.primary.required",
      message: "Designate one primary contact when team members are listed.",
      level: "error",
    });
  }
  if (primaryCount > 1) {
    issues.push({
      stepId: "team",
      code: "team.primary.multiple",
      message: "Only one primary contact can be designated.",
      level: "error",
    });
  }

  return issues;
}

/** Invitations must never fire while the draft remains unlaunched. */
export function assertNoInvitationsFromDraft(status: string): boolean {
  return status === "draft" || status === "ready" || status === "failed" || status === "abandoned";
}
