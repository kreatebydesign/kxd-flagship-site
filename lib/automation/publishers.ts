import type { Payload } from "payload";
import { createAutomationEvent } from "./engine";
import type { AutomationModule } from "./types";

export type { ModuleRegistryEntry } from "./registry";
export { MODULE_REGISTRY } from "./registry";

async function publish(
  module: AutomationModule,
  eventName: string,
  clientId: number | undefined,
  payload: Record<string, unknown>,
  payloadInstance?: Payload,
) {
  return createAutomationEvent(
    { module, eventName, clientId, payload },
    payloadInstance,
  );
}

export const publishers = {
  launch: {
    async clientLaunched(
      input: {
        clientId: number;
        title: string;
        summary: string;
        eventType?: string;
        createdBy?: string;
        source?: string;
      },
      payloadInstance?: Payload,
    ) {
      return publish(
        "Launch",
        "client.launched",
        input.clientId,
        {
          title: input.title,
          summary: input.summary,
          eventType: input.eventType ?? "client-launch",
          createdBy: input.createdBy,
          source: input.source,
        },
        payloadInstance,
      );
    },
  },

  onboarding: {
    async submitted(
      input: { clientId: number; summary?: string; onboardingId?: number; readinessScore?: number },
      payloadInstance?: Payload,
    ) {
      return publish(
        "Onboarding",
        "onboarding.submitted",
        input.clientId,
        {
          summary: input.summary,
          onboardingId: input.onboardingId,
          readinessScore: input.readinessScore,
        },
        payloadInstance,
      );
    },

    async approved(
      input: { clientId: number; onboardingId?: number; readinessScore?: number },
      payloadInstance?: Payload,
    ) {
      return publish(
        "Onboarding",
        "onboarding.approved",
        input.clientId,
        {
          onboardingId: input.onboardingId,
          readinessScore: input.readinessScore,
        },
        payloadInstance,
      );
    },
  },

  infrastructure: {
    async criticalEvent(
      input: {
        clientId: number;
        title: string;
        description?: string;
        infrastructureId?: number;
        eventId?: number;
      },
      payloadInstance?: Payload,
    ) {
      return publish(
        "Infrastructure",
        "infrastructure.critical",
        input.clientId,
        {
          title: input.title,
          description: input.description,
          infrastructureId: input.infrastructureId,
          infrastructureEventId: input.eventId,
        },
        payloadInstance,
      );
    },

    async registryInitialized(
      input: { clientId: number; infrastructureId: number; primaryDomain?: string },
      payloadInstance?: Payload,
    ) {
      return publish(
        "Infrastructure",
        "infrastructure.registry-initialized",
        input.clientId,
        {
          infrastructureId: input.infrastructureId,
          primaryDomain: input.primaryDomain,
          backfill: true,
        },
        payloadInstance,
      );
    },
  },

  websiteAuditor: {
    async auditCompleted(
      input: {
        clientId: number;
        websiteAuditId: number;
        website: string;
        overallScore: number;
        grade: string;
        email?: string;
      },
      payloadInstance?: Payload,
    ) {
      return publish(
        "Website Auditor",
        "website-audit.completed",
        input.clientId,
        {
          websiteAuditId: input.websiteAuditId,
          website: input.website,
          overallScore: input.overallScore,
          grade: input.grade,
          email: input.email,
        },
        payloadInstance,
      );
    },
  },

  growth: {
    async retainerCreated(
      input: {
        clientId: number;
        retainerId: number;
        retainerName: string;
        monthlyAmount?: number;
      },
      payloadInstance?: Payload,
    ) {
      return publish(
        "Growth",
        "retainer.created",
        input.clientId,
        {
          retainerId: input.retainerId,
          retainerName: input.retainerName,
          monthlyAmount: input.monthlyAmount,
        },
        payloadInstance,
      );
    },
  },

  projects: {
    async completed(
      input: { clientId: number; projectId: number; projectName: string },
      payloadInstance?: Payload,
    ) {
      return publish(
        "Projects",
        "project.completed",
        input.clientId,
        {
          projectId: input.projectId,
          projectName: input.projectName,
        },
        payloadInstance,
      );
    },
  },
};
