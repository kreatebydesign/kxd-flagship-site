import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import { resolveClientEntitlements } from "@/lib/client-plans";
import {
  isCesExperienceModuleId,
  isInternalOnlyCapability,
  normalizeReportingCapabilityList,
} from "@/lib/ces/modules/canonical";
import {
  normalizeBorderRadius,
  normalizeMotionPreset,
  normalizeSupportTone,
  parseTerminology,
} from "@/lib/ces/profile/defaults";
import { planAllowsPortalModule } from "./module-catalog";
import { sanitizeSelectedPortalModules } from "./compose";
import { loadOperatorExperienceSnapshot } from "./load";
import type { OperatorExperienceSaveInput, OperatorExperienceSnapshot } from "./types";
import { OPERATOR_TERMINOLOGY_KEYS } from "./types";

const HEX = /^#[0-9A-Fa-f]{6}$/;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function normalizeOptionalHex(raw: string, label: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!HEX.test(trimmed)) {
    throw new Error(`${label} must be a 6-digit hex color (e.g. #0B0B0B).`);
  }
  return trimmed;
}

function mergeTerminology(
  existing: unknown,
  incoming: Record<string, string>,
): Record<string, string> {
  const current = parseTerminology(existing);
  const next = { ...current };
  for (const key of OPERATOR_TERMINOLOGY_KEYS) {
    const value = incoming[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) next[key] = trimmed;
    else delete next[key];
  }
  return next;
}

export async function saveOperatorExperience(
  clientId: number,
  input: OperatorExperienceSaveInput,
): Promise<OperatorExperienceSnapshot> {
  if (!Number.isFinite(clientId) || clientId <= 0) {
    throw new Error("Invalid client.");
  }
  if (!["draft", "active", "archived"].includes(input.profileStatus)) {
    throw new Error("Invalid profile status.");
  }

  const clientName = input.clientName.trim();
  if (!clientName) throw new Error("Client name is required.");

  const selected = sanitizeSelectedPortalModules(input.selectedPortalModules);
  for (const raw of input.selectedPortalModules) {
    if (typeof raw !== "string") continue;
    if (isInternalOnlyCapability(raw) || raw === "advisor") {
      throw new Error("Internal-only or stub modules cannot be enabled.");
    }
  }

  const entitlements = await resolveClientEntitlements(clientId);
  for (const id of selected) {
    if (
      isCesExperienceModuleId(id) &&
      !planAllowsPortalModule(id, entitlements)
    ) {
      throw new Error(
        `Plan does not allow ${id}. Update Plans & Access before enabling it here.`,
      );
    }
  }

  const payload = await getPayload({ config });
  let client: Record<string, unknown>;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    throw new Error("Client not found.");
  }

  const profiles = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const existing = profiles.docs[0] as
    | { id: number; enabledModules?: unknown; terminology?: unknown; profileName?: string }
    | undefined;

  const reportingKept = normalizeReportingCapabilityList(
    asStringArray(existing?.enabledModules),
  );
  const enabledModules = [...selected, ...reportingKept];

  const data = {
    profileName: existing?.profileName?.trim() || `${clientName} Experience`,
    client: clientId,
    status: input.profileStatus,
    primaryColor: normalizeOptionalHex(input.primaryColor, "Primary color"),
    secondaryColor: normalizeOptionalHex(input.secondaryColor, "Secondary color"),
    accentColor: normalizeOptionalHex(input.accentColor, "Accent color"),
    borderRadiusPreset: normalizeBorderRadius(input.borderRadiusPreset),
    motionPreset: normalizeMotionPreset(input.motionPreset),
    welcomeEyebrow: input.welcomeEyebrow.trim(),
    reassuranceLine: input.reassuranceLine.trim(),
    supportTone: normalizeSupportTone(input.supportTone),
    portalSidebarLabel: input.portalSidebarLabel.trim() || clientName,
    showKxdPartnerMark: input.showKxdPartnerMark !== false,
    partnerFooterLine: input.partnerFooterLine.trim() || "Powered by Kreate by Design",
    enabledModules,
    terminology: mergeTerminology(existing?.terminology, input.terminology ?? {}),
  };

  if (existing) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      id: existing.id,
      data,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      data,
      overrideAccess: true,
    });
  }

  if (String(client.name ?? "") !== clientName) {
    await payload.update({
      collection: "clients",
      id: clientId,
      data: { name: clientName },
      overrideAccess: true,
    });
  }

  try {
    await createExecutiveEvent({
      client: clientId,
      eventType: "client.experience.updated",
      title: "Client experience updated",
      summary: `Experience profile ${input.profileStatus}; modules ${selected.join(", ") || "none"}.`,
      category: "system",
      importance: "normal",
      sourceModule: "Client Command",
      internalOnly: true,
    });
  } catch {
    /* best-effort */
  }

  const snapshot = await loadOperatorExperienceSnapshot(clientId);
  if (!snapshot) throw new Error("Unable to reload experience after save.");
  return snapshot;
}
