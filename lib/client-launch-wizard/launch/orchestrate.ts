import "server-only";

import { randomUUID } from "node:crypto";
import type { Payload } from "payload";
import { buildDefaultCesProfileData } from "@/lib/client-launch/defaults";
import {
  assignPlanOnClientCreate,
  derivePlanOverridesFromSelection,
} from "@/lib/client-plans";
import { publishers } from "@/lib/automation/publishers";
import {
  inviteTeamViaPortalAccess,
  markCommercialLaunchCompleted,
} from "@/lib/commercial-launch-handoff";
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
  excludeClientId?: number | null,
): Promise<boolean> {
  const existing = await payload.find({
    collection: "clients",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  const doc = existing.docs[0] as { id?: number } | undefined;
  if (!doc) return true;
  if (excludeClientId != null && Number(doc.id) === excludeClientId) return true;
  return false;
}

async function findOneByClient(
  payload: Payload,
  collection: "executive-client-profiles" | "client-experience-profiles" | "client-infrastructure",
  clientId: number,
): Promise<number | null> {
  const found = await payload.find({
    collection,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = found.docs[0] as { id?: number } | undefined;
  return doc?.id != null ? Number(doc.id) : null;
}

/**
 * Transactional-ish launch orchestration.
 * Creates Shared Core records only. Never runs provider ingest.
 * Never creates records for abandoned draft navigation.
 * Portal access uses Portal Access invitations (never fake "invite queued").
 */
export async function orchestrateClientLaunch(
  input: LaunchOrchestrationInput,
): Promise<LaunchOrchestrationOutcome> {
  const launchOperationId = input.launchOperationId || randomUUID();
  const handoff = input.draftPayload.commercialHandoff ?? null;
  const reuseClientId =
    handoff?.reuseExistingClient && handoff.sourceClientId != null
      ? handoff.sourceClientId
      : null;

  const readiness = computeLaunchReadiness(input.draftPayload, {
    ...input.uniqueness,
    // When reusing the linked commercial client, slug collision against that client is OK.
    slugTakenByClient:
      reuseClientId != null ? false : input.uniqueness.slugTakenByClient,
    nameTakenByClient:
      reuseClientId != null ? false : input.uniqueness.nameTakenByClient,
  });
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
  if (!(await clientSlugAvailable(input.payload, slug, reuseClientId))) {
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
  let createdNewClient = false;
  const created: {
    execProfileId?: number;
    cesProfileId?: number;
    infraId?: number;
    timelineId?: number;
  } = {};

  try {
    const commercialAgreementId =
      input.draftPayload.package.commercialAgreementId ?? "custom-legacy";
    const commercialLabel =
      input.draftPayload.package.displayName.trim() ||
      preset?.catalogLabel ||
      "package";

    if (reuseClientId != null) {
      try {
        await input.payload.findByID({
          collection: "clients",
          id: reuseClientId,
          depth: 0,
          overrideAccess: true,
        });
      } catch {
        return {
          ok: false,
          launchOperationId,
          failureSummary: `Linked client #${reuseClientId} was not found.`,
        };
      }

      await input.payload.update({
        collection: "clients",
        id: reuseClientId,
        data: {
          name: identity.businessName.trim() || undefined,
          slug,
          companyWebsite:
            identity.companyWebsite.trim() ||
            input.draftPayload.infrastructure.companyWebsite.trim() ||
            undefined,
          primaryContactName: identity.primaryContactName.trim() || undefined,
          primaryContactEmail: identity.primaryContactEmail.trim() || undefined,
          status: "active",
          notes: identity.internalNotes.trim() || undefined,
          monthlyRetainerAmount:
            input.draftPayload.package.monthlyStarting ?? undefined,
          commercialAgreementId,
          setupFee: input.draftPayload.package.setupFee ?? undefined,
          monthlyServiceCredits:
            input.draftPayload.package.monthlyServiceCredits ?? undefined,
          commercialAddOns: input.draftPayload.package.approvedAddOnIds,
          commercialNotes:
            input.draftPayload.package.commercialNotes.trim() || undefined,
        } as never,
        overrideAccess: true,
      });
      clientId = reuseClientId;
    } else {
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
          monthlyRetainerAmount:
            input.draftPayload.package.monthlyStarting ?? undefined,
          commercialAgreementId,
          setupFee: input.draftPayload.package.setupFee ?? undefined,
          monthlyServiceCredits:
            input.draftPayload.package.monthlyServiceCredits ?? undefined,
          commercialAddOns: input.draftPayload.package.approvedAddOnIds,
          commercialNotes:
            input.draftPayload.package.commercialNotes.trim() || undefined,
        } as never,
      });
      clientId = client.id as number;
      createdNewClient = true;
    }

    const existingExecId = await findOneByClient(
      input.payload,
      "executive-client-profiles",
      clientId,
    );
    if (existingExecId == null) {
      const execProfile = await input.payload.create({
        collection: "executive-client-profiles",
        data: {
          client: clientId,
          relationshipStatus: "active",
          executiveSummary: `Launched via Client Launch Wizard (${commercialLabel}).`,
          strategicNotes: identity.internalNotes.trim() || undefined,
        },
      });
      created.execProfileId = execProfile.id as number;
    }

    const cesData = buildDefaultCesProfileData({
      clientName: identity.businessName.trim(),
      clientSlug: slug,
      enabledModules: cesModules.length > 0 ? cesModules : ["website-review"],
    });

    const existingCesId = await findOneByClient(
      input.payload,
      "client-experience-profiles",
      clientId,
    );
    if (existingCesId == null) {
      const cesProfile = await input.payload.create({
        collection: "client-experience-profiles",
        data: {
          client: clientId,
          ...cesData,
          enabledModules,
        },
      });
      created.cesProfileId = cesProfile.id as number;
    } else {
      // Do not wipe custom pilot profiles — only sync entitlements/modules when empty-ish.
      await input.payload.update({
        collection: "client-experience-profiles",
        id: existingCesId,
        data: {
          enabledModules,
        } as never,
        overrideAccess: true,
      });
    }

    const planOverrides = derivePlanOverridesFromSelection(
      input.draftPayload.package.packageId,
      enabledModules,
    );
    if (planOverrides) {
      await assignPlanOnClientCreate(clientId, {
        planKey: planOverrides.planKey,
        addOnModules: planOverrides.addOnModules,
        removedModules: planOverrides.removedModules,
        actor: input.createdBy,
      });
    }

    const infra = input.draftPayload.infrastructure;
    const automation = input.draftPayload.automation;
    const existingInfraId = await findOneByClient(
      input.payload,
      "client-infrastructure",
      clientId,
    );
    if (existingInfraId == null) {
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
    }

    const origin =
      input.requestOrigin ||
      process.env.PORTAL_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const invitationOutcomes = await inviteTeamViaPortalAccess({
      payload: input.payload,
      clientId,
      clientName: identity.businessName.trim() || `Client #${clientId}`,
      team: input.draftPayload.team,
      origin,
    });

    const portalUsersCreated: LaunchWizardResult["portalUsersCreated"] = [];
    const portalUsersPending: LaunchWizardResult["portalUsersPending"] = [];

    for (const outcome of invitationOutcomes) {
      if (outcome.status === "skipped") {
        portalUsersPending.push({ email: outcome.email, role: outcome.role });
        continue;
      }
      portalUsersCreated.push({
        email: outcome.email,
        role: outcome.role,
        inviteQueued: false,
        invitationId: outcome.invitationId,
        invitationStatus: outcome.status,
        emailSent: outcome.emailSent,
        invitationMessage: outcome.message,
      });
    }

    const timeline = await input.payload.create({
      collection: "client-timeline-events",
      data: {
        client: clientId,
        eventType: "client-launch",
        title: "Client launched into KXD OS",
        summary: `Partnership launched via Client Launch Wizard (${commercialLabel}).`,
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

    if (handoff?.contractId != null) {
      try {
        await markCommercialLaunchCompleted({
          payload: input.payload,
          contractId: handoff.contractId,
          clientId,
          draftId: input.draftId,
          invitationIds: invitationOutcomes
            .map((o) => o.invitationId)
            .filter((id): id is number => typeof id === "number"),
          invitationOutcomes,
        });
      } catch (err) {
        console.error("[KXD Launch Wizard] Commercial handoff mark failed:", err);
      }
    }

    const failedInvites = invitationOutcomes.filter(
      (o) => o.status === "invitation-delivery-failed",
    );
    const followUps = [
      ...readiness.postLaunchFollowUps,
      ...failedInvites.map(
        (o) =>
          `Invitation delivery failed for ${o.email} — resend from Portal Access.`,
      ),
    ];

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
        packageLabel: commercialLabel,
        experienceChoiceId: input.draftPayload.experience.choiceId,
        modulesEnabled: enabledModules,
        portalUsersCreated,
        portalUsersPending,
        reportingProviders,
        automationEnabled: automation.reportingAutomationEnabled,
        syncHourPacific: automation.syncHourPacific,
        followUps,
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
    if (clientId != null && createdNewClient) {
      try {
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
