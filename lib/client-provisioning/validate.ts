import { normalizeClientSlug } from "@/lib/client-launch-wizard/validation/identity";
import type { ProvisioningPayload, ProvisioningStepId } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProvisioningIssue = {
  stepId: ProvisioningStepId;
  field: string;
  message: string;
};

function previewWebsiteIssue(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return "Preview Website must use https.";
    }
    if (!parsed.hostname) return "Preview Website must be a valid URL.";
    if (parsed.username || parsed.password) {
      return "Preview Website URLs cannot include credentials.";
    }
    return null;
  } catch {
    return "Preview Website must be a valid URL.";
  }
}

export function validateProvisioningPayload(
  payload: ProvisioningPayload,
  options?: {
    slugTaken?: boolean;
    nameTaken?: boolean;
    previewTaken?: boolean;
  },
): ProvisioningIssue[] {
  const issues: ProvisioningIssue[] = [];
  const id = payload.identity;
  const name = id.companyName.trim();
  const slug = normalizeClientSlug(id.companySlug || id.companyName);

  if (!name) {
    issues.push({
      stepId: "client",
      field: "companyName",
      message: "Company name is required.",
    });
  }
  if (!slug) {
    issues.push({
      stepId: "client",
      field: "companySlug",
      message: "Company slug is required.",
    });
  }
  if (options?.slugTaken) {
    issues.push({
      stepId: "client",
      field: "companySlug",
      message: `Slug "${slug}" is already in use.`,
    });
  }
  if (options?.nameTaken) {
    issues.push({
      stepId: "client",
      field: "companyName",
      message: `A client named "${name}" already exists.`,
    });
  }
  if (!id.primaryContact.trim()) {
    issues.push({
      stepId: "client",
      field: "primaryContact",
      message: "Primary contact is required.",
    });
  }
  if (!id.email.trim()) {
    issues.push({
      stepId: "client",
      field: "email",
      message: "Email is required.",
    });
  } else if (!EMAIL_RE.test(id.email.trim())) {
    issues.push({
      stepId: "client",
      field: "email",
      message: "Enter a valid email address.",
    });
  }

  const preview =
    id.previewWebsite.trim() || payload.infrastructure.previewWebsite.trim();
  const previewError = previewWebsiteIssue(preview);
  if (previewError) {
    issues.push({
      stepId: "client",
      field: "previewWebsite",
      message: previewError,
    });
  } else if (preview && options?.previewTaken) {
    issues.push({
      stepId: "client",
      field: "previewWebsite",
      message: "Preview Website is already assigned to another client.",
    });
  }

  if (!payload.packageId) {
    issues.push({
      stepId: "package",
      field: "packageId",
      message: "Choose a platform package.",
    });
  }

  if (!payload.modules.some((row) => row.enabled)) {
    issues.push({
      stepId: "modules",
      field: "modules",
      message: "Enable at least one module.",
    });
  }

  const seats = payload.portalSeats.filter((seat) => seat.email.trim());
  if (seats.length === 0) {
    issues.push({
      stepId: "portal",
      field: "portalSeats",
      message: "Add at least one portal user email.",
    });
  }
  for (const seat of seats) {
    if (!EMAIL_RE.test(seat.email.trim())) {
      issues.push({
        stepId: "portal",
        field: "portalSeats",
        message: `Invalid portal email: ${seat.email}`,
      });
    }
  }

  const hour = payload.automation.reportingSyncHourPacific;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    issues.push({
      stepId: "automation",
      field: "reportingSyncHourPacific",
      message: "Reporting sync hour must be between 0 and 23.",
    });
  }

  return issues;
}
