import { slugifyBusinessName } from "@/lib/client-launch/slug";
import type { LaunchWizardIdentity, LaunchWizardValidationIssue } from "../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBSITE_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

export function normalizeClientSlug(input: string): string {
  return slugifyBusinessName(input);
}

export function validateEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function validateWebsiteFormat(website: string): boolean {
  const trimmed = website.trim();
  if (!trimmed) return true;
  return WEBSITE_RE.test(trimmed);
}

export function validateIdentityStep(
  identity: LaunchWizardIdentity,
  options?: {
    slugTakenByClient?: boolean;
    slugTakenByDraft?: boolean;
    nameTakenByClient?: boolean;
  },
): LaunchWizardValidationIssue[] {
  const issues: LaunchWizardValidationIssue[] = [];
  const name = identity.businessName.trim();
  const slug = normalizeClientSlug(identity.clientSlug || identity.businessName);
  const email = identity.primaryContactEmail.trim();

  if (!name) {
    issues.push({
      stepId: "identity",
      field: "businessName",
      code: "identity.businessName.required",
      message: "Business name is required.",
      level: "error",
    });
  }

  if (!slug) {
    issues.push({
      stepId: "identity",
      field: "clientSlug",
      code: "identity.clientSlug.required",
      message: "Client slug is required.",
      level: "error",
    });
  }

  if (options?.slugTakenByClient) {
    issues.push({
      stepId: "identity",
      field: "clientSlug",
      code: "identity.clientSlug.exists",
      message: `A client with slug "${slug}" already exists. Choose another slug — existing clients are never overwritten.`,
      level: "error",
    });
  }

  if (options?.slugTakenByDraft) {
    issues.push({
      stepId: "identity",
      field: "clientSlug",
      code: "identity.clientSlug.draftExists",
      message: `Another launch draft already uses slug "${slug}".`,
      level: "error",
    });
  }

  if (options?.nameTakenByClient) {
    issues.push({
      stepId: "identity",
      field: "businessName",
      code: "identity.businessName.exists",
      message: `A client named "${name}" already exists. Never silently overwrite an existing client.`,
      level: "error",
    });
  }

  if (!identity.primaryContactName.trim()) {
    issues.push({
      stepId: "identity",
      field: "primaryContactName",
      code: "identity.primaryContactName.required",
      message: "Primary contact name is required.",
      level: "error",
    });
  }

  if (!email) {
    issues.push({
      stepId: "identity",
      field: "primaryContactEmail",
      code: "identity.primaryContactEmail.required",
      message: "Primary contact email is required.",
      level: "error",
    });
  } else if (!validateEmailFormat(email)) {
    issues.push({
      stepId: "identity",
      field: "primaryContactEmail",
      code: "identity.primaryContactEmail.invalid",
      message: "Enter a valid email address.",
      level: "error",
    });
  }

  if (!validateWebsiteFormat(identity.companyWebsite)) {
    issues.push({
      stepId: "identity",
      field: "companyWebsite",
      code: "identity.companyWebsite.invalid",
      message: "Company website must be a valid URL or domain.",
      level: "error",
    });
  }

  return issues;
}
