import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import type { Payload } from "payload";
import { publishers } from "@/lib/automation/publishers";
import { buildDefaultCesProfileData } from "@/lib/client-launch/defaults";
import {
  assignPlanOnClientCreate,
  derivePlanOverridesFromSelection,
} from "@/lib/client-plans";
import {
  buildAdminClientWorkspaceUrl,
  buildPortalHomeUrl,
} from "@/lib/client-launch-wizard/urls";
import { normalizeClientSlug } from "@/lib/client-launch-wizard/validation/identity";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import {
  checkPreviewWebsiteHealth,
  findDuplicatePreviewWebsite,
  validatePreviewWebsiteUrl,
} from "@/lib/infrastructure/preview-domain";
import { PROVISIONING_SOURCE } from "./constants";
import {
  getProvisioningPackage,
  resolveCesModules,
  resolvePersistableEntitlements,
} from "./packages/resolve";
import { checkProvisioningUniqueness } from "./uniqueness";
import { validateProvisioningPayload } from "./validate";
import type {
  ProvisionLogEntry,
  ProvisioningOutcome,
  ProvisioningPayload,
} from "./types";

export type ProvisionOrchestrationInput = {
  payload: Payload;
  draft: ProvisioningPayload;
  createdBy: string;
  requestOrigin?: string | null;
  provisionOperationId?: string;
  /** When true, skip live HTTP health probe (tests / offline). */
  skipPreviewHealth?: boolean;
};

function pushLog(
  log: ProvisionLogEntry[],
  level: ProvisionLogEntry["level"],
  message: string,
) {
  log.push({ at: new Date().toISOString(), level, message });
}

function buildClientNotes(draft: ProvisioningPayload): string {
  const lines: string[] = [];
  if (draft.identity.industry.trim()) {
    lines.push(`Industry: ${draft.identity.industry.trim()}`);
  }
  if (draft.identity.phone.trim()) {
    lines.push(`Phone: ${draft.identity.phone.trim()}`);
  }
  if (draft.identity.address.trim()) {
    lines.push(`Address: ${draft.identity.address.trim()}`);
  }
  const infraNotes = [
    draft.infrastructure.reportingNotes,
    draft.infrastructure.googleCalendarNotes,
    draft.infrastructure.googleDriveNotes,
    draft.infrastructure.blobNotes,
    draft.infrastructure.resendNotes,
  ]
    .map((v) => v.trim())
    .filter(Boolean);
  if (infraNotes.length) {
    lines.push("Infrastructure notes:");
    lines.push(...infraNotes.map((n) => `- ${n}`));
  }
  lines.push(`Provisioned via Client Provisioning Engine (${draft.packageId}).`);
  return lines.join("\n");
}

/**
 * Shared Core client provisioning with compensating rollback.
 * Does not replace Launch Wizard — executes platform provisioning only.
 */
export async function orchestrateClientProvision(
  input: ProvisionOrchestrationInput,
): Promise<ProvisioningOutcome> {
  const provisionOperationId = input.provisionOperationId || randomUUID();
  const log: ProvisionLogEntry[] = [];
  const uniqueness = await checkProvisioningUniqueness(input.payload, {
    companyName: input.draft.identity.companyName,
    companySlug: input.draft.identity.companySlug,
    previewWebsite:
      input.draft.identity.previewWebsite ||
      input.draft.infrastructure.previewWebsite,
  });

  const issues = validateProvisioningPayload(input.draft, {
    slugTaken: uniqueness.slugTaken,
    nameTaken: uniqueness.nameTaken,
    previewTaken: uniqueness.previewTaken,
  });
  if (issues.length > 0) {
    pushLog(log, "error", issues[0]!.message);
    return {
      success: false,
      provisionOperationId,
      failureSummary: issues[0]!.message,
      log,
      rolledBack: false,
    };
  }

  const identity = input.draft.identity;
  const slug = uniqueness.slug;
  const packageMeta = getProvisioningPackage(input.draft.packageId);
  const entitlements = resolvePersistableEntitlements(input.draft.modules);
  const cesModules = resolveCesModules(entitlements);
  const enabledModules =
    entitlements.length > 0
      ? entitlements
      : (["website-review"] as string[]);

  const productionWebsite =
    input.draft.infrastructure.productionWebsite.trim() ||
    identity.companyWebsite.trim();
  const previewRaw =
    identity.previewWebsite.trim() ||
    input.draft.infrastructure.previewWebsite.trim();
  const previewChecked = validatePreviewWebsiteUrl(previewRaw);
  const previewWebsite =
    previewChecked.ok && previewChecked.url ? previewChecked.url : "";

  if (previewWebsite) {
    const dup = await findDuplicatePreviewWebsite(
      input.payload,
      previewWebsite,
      null,
    );
    if (dup) {
      pushLog(log, "error", "Preview Website already assigned.");
      return {
        success: false,
        provisionOperationId,
        failureSummary: "Preview Website is already assigned to another client.",
        log,
        rolledBack: false,
      };
    }
  }

  let clientId: number | null = null;
  const created: {
    execProfileId?: number;
    cesProfileId?: number;
    infraId?: number;
    timelineId?: number;
    executiveEventId?: number;
    portalUserEmails: string[];
  } = { portalUserEmails: [] };

  try {
    pushLog(log, "info", `Creating client “${identity.companyName.trim()}”…`);
    const client = await input.payload.create({
      collection: "clients",
      data: {
        name: identity.companyName.trim(),
        slug,
        companyWebsite: productionWebsite || undefined,
        primaryContactName: identity.primaryContact.trim() || undefined,
        primaryContactEmail: identity.email.trim().toLowerCase() || undefined,
        status: identity.clientStatus,
        notes: buildClientNotes(input.draft),
      },
      overrideAccess: true,
    });
    clientId = client.id as number;
    pushLog(log, "success", `Client created (#${clientId}).`);

    pushLog(log, "info", "Creating executive profile…");
    const execProfile = await input.payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-client-profiles" as any,
      data: {
        client: clientId,
        relationshipStatus: "active",
        executiveSummary: `Provisioned via Client Provisioning Engine (${packageMeta?.label ?? input.draft.packageId}).`,
        strategicNotes: [
          identity.industry.trim()
            ? `Industry: ${identity.industry.trim()}`
            : null,
          `Modules: ${input.draft.modules
            .filter((m) => m.enabled)
            .map((m) => m.moduleId)
            .join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
        productionUrl: productionWebsite || undefined,
        stagingUrl: previewWebsite || undefined,
      },
      overrideAccess: true,
    });
    created.execProfileId = execProfile.id as number;
    pushLog(log, "success", "Executive profile ready.");

    pushLog(log, "info", "Creating experience profile and entitlements…");
    const cesData = buildDefaultCesProfileData({
      clientName: identity.companyName.trim(),
      clientSlug: slug,
      enabledModules:
        cesModules.length > 0 ? cesModules : ["website-review"],
    });
    const cesProfile = await input.payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      data: {
        client: clientId,
        ...cesData,
        enabledModules,
      },
      overrideAccess: true,
    });
    created.cesProfileId = cesProfile.id as number;
    pushLog(
      log,
      "success",
      `Entitlements: ${enabledModules.join(", ") || "none"}.`,
    );

    const planOverrides = derivePlanOverridesFromSelection(
      input.draft.packageId,
      enabledModules,
    );
    if (planOverrides) {
      pushLog(log, "info", `Assigning plan “${planOverrides.planKey}”…`);
      await assignPlanOnClientCreate(clientId, {
        planKey: planOverrides.planKey,
        addOnModules: planOverrides.addOnModules,
        removedModules: planOverrides.removedModules,
        actor: input.createdBy || "KXD Client Provisioning",
      });
      pushLog(log, "success", `Plan assigned: ${planOverrides.planKey}.`);
    }

    pushLog(log, "info", "Creating infrastructure record…");
    const infraDoc = await input.payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      data: {
        client: clientId,
        status: previewWebsite ? "healthy" : "unknown",
        productionUrl: productionWebsite || undefined,
        stagingUrl: previewWebsite || undefined,
        ga4PropertyId: input.draft.infrastructure.ga4PropertyId.trim() || undefined,
        searchConsoleSiteUrl:
          input.draft.infrastructure.searchConsoleSiteUrl.trim() || undefined,
        reportingAutomationEnabled: input.draft.automation.reportingSchedule,
        reportingSyncHourPacific: input.draft.automation.reportingSyncHourPacific,
        internalNotes: [
          input.draft.infrastructure.reportingNotes.trim(),
          input.draft.infrastructure.googleCalendarNotes.trim()
            ? `Calendar: ${input.draft.infrastructure.googleCalendarNotes.trim()}`
            : "",
          input.draft.infrastructure.googleDriveNotes.trim()
            ? `Drive: ${input.draft.infrastructure.googleDriveNotes.trim()}`
            : "",
          input.draft.infrastructure.blobNotes.trim()
            ? `Blob: ${input.draft.infrastructure.blobNotes.trim()}`
            : "",
          input.draft.infrastructure.resendNotes.trim()
            ? `Resend: ${input.draft.infrastructure.resendNotes.trim()}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        lastReviewedAt: new Date().toISOString(),
        reviewedBy: input.createdBy,
      },
      overrideAccess: true,
    });
    created.infraId = infraDoc.id as number;
    pushLog(log, "success", "Infrastructure configured.");

    const portalUsersCreated: Array<{ email: string; role: string }> = [];
    pushLog(log, "info", "Creating portal seats…");
    for (const seat of input.draft.portalSeats) {
      const email = seat.email.trim().toLowerCase();
      if (!email) continue;
      const tempPassword = `Kxd!${randomBytes(18).toString("base64url")}`;
      await input.payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        data: {
          email,
          password: tempPassword,
          displayName: seat.displayName.trim() || identity.primaryContact.trim() || email,
          client: clientId,
          active: true,
        },
        overrideAccess: true,
      });
      created.portalUserEmails.push(email);
      portalUsersCreated.push({ email, role: seat.role });
      pushLog(
        log,
        "success",
        `Portal ${seat.role}: ${email}${seat.sendInvite ? " (invite queued)" : ""}.`,
      );
    }

    pushLog(log, "info", "Writing timeline + activity…");
    const timeline = await input.payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-timeline-events" as any,
      data: {
        client: clientId,
        eventType: "client-launch",
        title: "Client provisioned into KXD OS",
        summary: `Provisioned via Client Provisioning Engine (${packageMeta?.label ?? input.draft.packageId}).`,
        eventDate: new Date().toISOString(),
        createdBy: input.createdBy || "KXD Client Provisioning",
        source: PROVISIONING_SOURCE,
      },
      overrideAccess: true,
    });
    created.timelineId = timeline.id as number;

    try {
      const execEvent = await createExecutiveEvent(
        {
          client: clientId,
          eventType: "client.provisioned",
          title: "Client provisioned into KXD OS",
          summary: `Shared Core records created via Provisioning Engine.`,
          category: "launch",
          importance: "high",
          sourceModule: "Launch",
          createdBy: input.createdBy || "KXD Client Provisioning",
          internalOnly: true,
          metadata: {
            source: PROVISIONING_SOURCE,
            provisionOperationId,
            packageId: input.draft.packageId,
            modules: input.draft.modules.filter((m) => m.enabled).map((m) => m.moduleId),
          },
        },
        input.payload,
      );
      created.executiveEventId = Number(execEvent.id);
    } catch (err) {
      pushLog(
        log,
        "warn",
        `Executive timeline write skipped: ${err instanceof Error ? err.message : "error"}`,
      );
    }

    try {
      await publishers.launch.clientLaunched(
        {
          clientId,
          title: "Client provisioned into KXD OS",
          summary: "Partnership provisioned via Client Provisioning Engine.",
          eventType: "client-provisioned",
          createdBy: input.createdBy || "KXD Client Provisioning",
          source: PROVISIONING_SOURCE,
        },
        input.payload,
      );
    } catch (err) {
      pushLog(
        log,
        "warn",
        `Activity publish skipped: ${err instanceof Error ? err.message : "error"}`,
      );
    }

    let previewVerified: boolean | null = null;
    if (previewWebsite && !input.skipPreviewHealth) {
      pushLog(log, "info", "Verifying Preview Website…");
      const health = await checkPreviewWebsiteHealth(previewWebsite);
      previewVerified = health.status === "reachable";
      pushLog(
        log,
        previewVerified ? "success" : "warn",
        `Preview health: ${health.message}`,
      );
    } else if (previewWebsite) {
      previewVerified = null;
      pushLog(log, "info", "Preview Website configured (health check skipped).");
    }

    const modulesEnabled = input.draft.modules
      .filter((m) => m.enabled)
      .map((m) => m.moduleId);

    const websiteReviewReady = enabledModules.includes("website-review");
    const envOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? null;

    pushLog(log, "success", "Provisioning complete.");

    return {
      success: true,
      provisionOperationId,
      clientId,
      clientName: identity.companyName.trim(),
      clientSlug: slug,
      packageId: input.draft.packageId,
      packageLabel: packageMeta?.label ?? input.draft.packageId,
      modulesEnabled,
      entitlementsPersisted: enabledModules,
      portalUsersCreated,
      infrastructureConfigured: true,
      previewConfigured: Boolean(previewWebsite),
      previewVerified,
      websiteReviewReady,
      reportingAutomationEnabled: input.draft.automation.reportingSchedule,
      adminWorkspaceUrl: buildAdminClientWorkspaceUrl(clientId, {
        requestOrigin: input.requestOrigin,
        envOrigin,
      }),
      portalUrl: buildPortalHomeUrl({
        requestOrigin: input.requestOrigin,
        envOrigin,
      }),
      websiteReviewUrl: `${buildPortalHomeUrl({
        requestOrigin: input.requestOrigin,
        envOrigin,
      })}/website-review`,
      log,
    };
  } catch (err) {
    pushLog(
      log,
      "error",
      err instanceof Error ? err.message : "Provisioning failed.",
    );

    let rolledBack = false;
    if (clientId != null) {
      pushLog(log, "info", "Rolling back partial provision…");
      try {
        for (const email of created.portalUserEmails) {
          const found = await input.payload.find({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "portal-users" as any,
            where: {
              and: [
                { email: { equals: email } },
                { client: { equals: clientId } },
              ],
            },
            limit: 10,
            depth: 0,
            overrideAccess: true,
          });
          for (const doc of found.docs) {
            await input.payload.delete({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              collection: "portal-users" as any,
              id: doc.id,
              overrideAccess: true,
            });
          }
        }
        if (created.executiveEventId) {
          try {
            await input.payload.delete({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              collection: "executive-timeline-events" as any,
              id: created.executiveEventId,
              overrideAccess: true,
            });
          } catch {
            /* best effort */
          }
        }
        if (created.timelineId) {
          await input.payload.delete({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "client-timeline-events" as any,
            id: created.timelineId,
            overrideAccess: true,
          });
        }
        if (created.infraId) {
          await input.payload.delete({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "client-infrastructure" as any,
            id: created.infraId,
            overrideAccess: true,
          });
        }
        if (created.cesProfileId) {
          await input.payload.delete({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "client-experience-profiles" as any,
            id: created.cesProfileId,
            overrideAccess: true,
          });
        }
        if (created.execProfileId) {
          await input.payload.delete({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "executive-client-profiles" as any,
            id: created.execProfileId,
            overrideAccess: true,
          });
        }
        await input.payload.delete({
          collection: "clients",
          id: clientId,
          overrideAccess: true,
        });
        rolledBack = true;
        pushLog(log, "success", "Rollback complete.");
      } catch (cleanupErr) {
        pushLog(
          log,
          "error",
          `Rollback incomplete: ${cleanupErr instanceof Error ? cleanupErr.message : "error"}`,
        );
      }
    }

    return {
      success: false,
      provisionOperationId,
      failureSummary:
        err instanceof Error ? err.message : "Provisioning failed.",
      log,
      rolledBack,
    };
  }
}

export { normalizeClientSlug };
