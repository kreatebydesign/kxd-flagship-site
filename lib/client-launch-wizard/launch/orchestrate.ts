import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import type { Payload } from "payload";
import { buildDefaultCesProfileData } from "@/lib/client-launch/defaults";
import { publishers } from "@/lib/automation/publishers";
import { normalizeClientSlug } from "../validation/identity";
import { persistableEntitlementIds } from "../packages/resolve";
import { getLaunchPackagePreset } from "../packages/presets";
import { computeLaunchReadiness } from "../readiness/compute";
import { sanitizeLaunchFailureMessage } from "../sanitize";
import { buildAdminClientWorkspaceUrl, buildPortalHomeUrl } from "../urls";
import type {
  LaunchIntegrationIntention,
  LaunchWizardDraftPayload,
  LaunchWizardResult,
} from "../types";

export type LaunchOrchestrationInput = {
  payload: Payload;
  draftId: string | number;
  draftPayload: LaunchWizardDraftPayload;
  createdBy: string;
  launchOperationId?: string;
  uniqueness: {
    slugTakenByClient: boolean;
    slugTakenByDraft: boolean;
    nameTakenByClient: boolean;
  };
  requestOrigin?: string | null;
};

export type LaunchOrchestrationOutcome =
  | { ok: true; result: LaunchWizardResult }
  | { ok: false; failureSummary: string; launchOperationId: string };

function intentionOrNotIncluded(
  value: LaunchIntegrationIntention,
): LaunchIntegrationIntention {
  return value === "connected" ? "requested" : value;
}

async function clientSlugAvailable(
  payload: Payload,
  slug: string,
): Promise<boolean> {
  const existing = await payload.find({
    collection: "clients",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  return existing.docs.length === 0;
}

/**
 * Transactional-ish launch orchestration.
 * Creates Shared Core records only. Never runs provider ingest.
 * Never creates records for abandoned draft navigation.
 */
export async function orchestrateClientLaunch(
  input: LaunchOrchestrationInput,
): Promise<LaunchOrchestrationOutcome> {
  const launchOperationId = input.launchOperationId || randomUUID();
  const readiness = computeLaunchReadiness(input.draftPayload, input.uniqueness);
  if (!readiness.canLaunch) {
    return {
      ok: false,
      launchOperationId,
      failureSummary: sanitizeLaunchFailureMessage(
        readiness.blockers[0] || "Launch blocked by validation.",
      ),
    };
  }

  const identity = input.draftPayload.identity;
  const slug = normalizeClientSlug(identity.clientSlug || identity.businessName);
  if (!(await clientSlugAvailable(input.payload, slug))) {
    return {
      ok: false,
      launchOperationId,
      failureSummary: `A client with slug "${slug}" already exists.`,
    };
  }

  const preset = getLaunchPackagePreset(input.draftPayload.package.packageId);
  const modules = persistableEntitlementIds(input.draftPayload.modules);
  const cesModules = modules.filter(
    (id) => id === "website-review" || id === "executive-performance",
  ) as Array<"website-review" | "executive-performance">;
  const enabledModules = modules.length > 0 ? modules : ["website-review"];

  let clientId: number | null = null;
  const created: {
    execProfileId?: number;
    cesProfileId?: number;
    infraId?: number;
    timelineId?: number;
    portalUserEmails: string[];
  } = { portalUserEmails: [] };

  try {
    const client = await input.payload.create({
      collection: "clients",
      data: {
        name: identity.businessName.trim(),
        slug,
        companyWebsite:
          identity.companyWebsite.trim() ||
          input.draftPayload.infrastructure.companyWebsite.trim() ||
          undefined,
        primaryContactName: identity.primaryContactName.trim() || undefined,
        primaryContactEmail: identity.primaryContactEmail.trim() || undefined,
        status: "active",
        notes: identity.internalNotes.trim() || undefined,
      },
    });
    clientId = client.id as number;

    const execProfile = await input.payload.create({
      collection: "executive-client-profiles",
      data: {
        client: clientId,
        relationshipStatus: "active",
        executiveSummary: `Launched via Client Launch Wizard (${preset?.catalogLabel ?? "package"}).`,
        strategicNotes: identity.internalNotes.trim() || undefined,
      },
    });
    created.execProfileId = execProfile.id as number;

    const cesData = buildDefaultCesProfileData({
      clientName: identity.businessName.trim(),
      clientSlug: slug,
      enabledModules:
        cesModules.length > 0 ? cesModules : ["website-review"],
    });

    const cesProfile = await input.payload.create({
      collection: "client-experience-profiles",
      data: {
        client: clientId,
        ...cesData,
        // Reporting + CES module IDs share enabledModules (Shared Core pattern).
        enabledModules,
      },
    });
    created.cesProfileId = cesProfile.id as number;

    const infra = input.draftPayload.infrastructure;
    const automation = input.draftPayload.automation;
    const infraDoc = await input.payload.create({
      collection: "client-infrastructure",
      data: {
        client: clientId,
        status: "unknown",
        productionUrl: infra.productionUrl.trim() || undefined,
        stagingUrl: infra.stagingUrl.trim() || undefined,
        searchConsoleSiteUrl: infra.searchConsoleSiteUrl.trim() || undefined,
        ga4PropertyId: infra.ga4PropertyId.trim() || undefined,
        googleAdsCustomerId: infra.googleAdsCustomerId.trim() || undefined,
        reportingAutomationEnabled: automation.reportingAutomationEnabled,
        reportingSyncHourPacific: automation.syncHourPacific,
        internalNotes: infra.notes.trim() || undefined,
        lastReviewedAt: new Date().toISOString(),
        reviewedBy: input.createdBy,
      },
    });
    created.infraId = infraDoc.id as number;

    const portalUsersCreated: LaunchWizardResult["portalUsersCreated"] = [];
    const portalUsersPending: LaunchWizardResult["portalUsersPending"] = [];

    for (const member of input.draftPayload.team) {
      if (!member.inviteOnLaunch) {
        portalUsersPending.push({ email: member.email.trim().toLowerCase(), role: member.role });
        continue;
      }
      const tempPassword = `Kxd!${randomBytes(18).toString("base64url")}`;
      await input.payload.create({
        collection: "portal-users",
        data: {
          email: member.email.trim().toLowerCase(),
          password: tempPassword,
          displayName: member.name.trim() || member.email.trim(),
          client: clientId,
          active: true,
        },
      });
      created.portalUserEmails.push(member.email.trim().toLowerCase());
      portalUsersCreated.push({
        email: member.email.trim().toLowerCase(),
        role: member.role,
        inviteQueued: true,
      });
      // Temporary password is intentionally discarded — invite email is Phase 34B.
    }

    const timeline = await input.payload.create({
      collection: "client-timeline-events",
      data: {
        client: clientId,
        eventType: "client-launch",
        title: "Client launched into KXD OS",
        summary: `Partnership launched via Client Launch Wizard (${preset?.catalogLabel ?? "package"}).`,
        eventDate: new Date().toISOString(),
        createdBy: input.createdBy || "KXD Client Launch Wizard",
        source: "client-launch-wizard",
      },
    });
    created.timelineId = timeline.id as number;

    try {
      await publishers.launch.clientLaunched(
        {
          clientId,
          title: "Client launched into KXD OS",
          summary: `Partnership launched via Client Launch Wizard.`,
          eventType: "client-launch",
          createdBy: input.createdBy || "KXD Client Launch Wizard",
          source: "client-launch-wizard",
        },
        input.payload,
      );
    } catch (err) {
      console.error("[KXD Launch Wizard] Automation publish failed:", err);
    }

    const reportingProviders = [
      {
        provider: "search-console",
        intention: intentionOrNotIncluded(infra.searchConsoleIntention),
      },
      {
        provider: "ga4",
        intention: intentionOrNotIncluded(infra.ga4Intention),
      },
      {
        provider: "ads",
        intention: intentionOrNotIncluded(infra.googleAdsIntention),
      },
    ].filter((row) => row.intention !== "not-included");

    return {
      ok: true,
      result: {
        success: true,
        launchOperationId,
        clientId,
        clientName: identity.businessName.trim(),
        clientSlug: slug,
        packageId: input.draftPayload.package.packageId,
        packageLabel: preset?.catalogLabel ?? input.draftPayload.package.packageId,
        experienceChoiceId: input.draftPayload.experience.choiceId,
        modulesEnabled: enabledModules,
        portalUsersCreated,
        portalUsersPending,
        reportingProviders,
        automationEnabled: automation.reportingAutomationEnabled,
        syncHourPacific: automation.syncHourPacific,
        followUps: readiness.postLaunchFollowUps,
        adminWorkspaceUrl: buildAdminClientWorkspaceUrl(clientId, {
          requestOrigin: input.requestOrigin,
          envOrigin: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? null,
        }),
        portalUrl: buildPortalHomeUrl({
          requestOrigin: input.requestOrigin,
          envOrigin: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? null,
        }),
      },
    };
  } catch (err) {
    // Compensating cleanup for partial creates when transaction is unavailable.
    if (clientId != null) {
      try {
        for (const email of created.portalUserEmails) {
          const found = await input.payload.find({
            collection: "portal-users",
            where: {
              and: [
                { email: { equals: email } },
                { client: { equals: clientId } },
              ],
            },
            limit: 10,
            depth: 0,
          });
          for (const doc of found.docs) {
            await input.payload.delete({ collection: "portal-users", id: doc.id });
          }
        }
        if (created.timelineId) {
          await input.payload.delete({
            collection: "client-timeline-events",
            id: created.timelineId,
          });
        }
        if (created.infraId) {
          await input.payload.delete({
            collection: "client-infrastructure",
            id: created.infraId,
          });
        }
        if (created.cesProfileId) {
          await input.payload.delete({
            collection: "client-experience-profiles",
            id: created.cesProfileId,
          });
        }
        if (created.execProfileId) {
          await input.payload.delete({
            collection: "executive-client-profiles",
            id: created.execProfileId,
          });
        }
        await input.payload.delete({ collection: "clients", id: clientId });
      } catch (cleanupErr) {
        console.error("[KXD Launch Wizard] Compensating cleanup failed:", cleanupErr);
      }
    }

    return {
      ok: false,
      launchOperationId,
      failureSummary: sanitizeLaunchFailureMessage(
        err instanceof Error ? err.message : "Launch failed.",
      ),
    };
  }
}
