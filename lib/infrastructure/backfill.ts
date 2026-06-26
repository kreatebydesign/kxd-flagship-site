import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  calculateAnnualStackCost,
  calculateInfrastructureScore,
  calculateMonthlyStackCost,
} from "./data";
import { publishers } from "@/lib/automation/publishers";
import type { InfraDoc } from "./types";

export interface BackfillResult {
  created: number;
  skipped: number;
  errors: string[];
}

function normalizeDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
}

function sslFromUrl(url: string | null | undefined): "valid" | "missing" | "unknown" {
  if (!url) return "unknown";
  return /^https:\/\//i.test(url.trim()) ? "valid" : "missing";
}

/**
 * Creates placeholder infrastructure records for clients that do not have one.
 * Never overwrites existing records.
 */
export async function ensureClientInfrastructureRecords(): Promise<BackfillResult> {
  const payload = await getPayload({ config });
  const result: BackfillResult = { created: 0, skipped: 0, errors: [] };

  const [clientsR, existingR] = await Promise.allSettled([
    payload.find({
      collection: "clients",
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  if (clientsR.status !== "fulfilled") {
    result.errors.push("Failed to load clients.");
    return result;
  }

  const clients = clientsR.value.docs as InfraDoc[];
  const existing =
    existingR.status === "fulfilled" ? (existingR.value.docs as InfraDoc[]) : [];
  const existingClientIds = new Set(
    existing.map((r) =>
      typeof r.client === "object" && r.client !== null
        ? Number((r.client as InfraDoc).id)
        : Number(r.client),
    ),
  );

  for (const client of clients) {
    const clientId = client.id as number;
    if (existingClientIds.has(clientId)) {
      result.skipped++;
      continue;
    }

    try {
      const [onboardingR, projectsR, timelineR, auditsR] = await Promise.allSettled([
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "client-onboarding" as any,
          where: { client: { equals: clientId } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          collection: "client-projects",
          where: { client: { equals: clientId } },
          limit: 5,
          depth: 0,
          sort: "-updatedAt",
          overrideAccess: true,
        }),
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "client-timeline-events" as any,
          where: {
            and: [
              { client: { equals: clientId } },
              { eventType: { in: ["deployment", "website-launch", "domain-renewal"] } },
            ],
          },
          limit: 5,
          depth: 0,
          sort: "-eventDate",
          overrideAccess: true,
        }),
        payload.find({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "website-audits" as any,
          where: {
            or: [
              { company: { equals: String(client.name ?? "") } },
              { email: { equals: String(client.primaryContactEmail ?? "") } },
            ],
          },
          limit: 1,
          depth: 0,
          sort: "-createdAt",
          overrideAccess: true,
        }),
      ]);

      const onboarding =
        onboardingR.status === "fulfilled" && onboardingR.value.docs.length > 0
          ? (onboardingR.value.docs[0] as InfraDoc)
          : null;
      const projects =
        projectsR.status === "fulfilled" ? (projectsR.value.docs as InfraDoc[]) : [];
      const timeline =
        timelineR.status === "fulfilled" ? (timelineR.value.docs as InfraDoc[]) : [];
      const audit =
        auditsR.status === "fulfilled" && auditsR.value.docs.length > 0
          ? (auditsR.value.docs[0] as InfraDoc)
          : null;

      const websiteUrl = String(
        onboarding?.currentWebsite ?? client.companyWebsite ?? audit?.website ?? "",
      ).trim();
      const primaryDomain = normalizeDomain(websiteUrl);
      const activeProject = projects.find(
        (p) => !["archived"].includes(String(p.status)),
      );

      const lastDeploy = timeline.find((e) =>
        ["deployment", "website-launch"].includes(String(e.eventType)),
      );

      const draft: InfraDoc = {
        client: clientId,
        status: "unknown",
        primaryDomain: primaryDomain ?? undefined,
        domainRegistrar: onboarding?.domainRegistrar ?? undefined,
        hostingProvider: onboarding?.hostingProvider ?? undefined,
        productionUrl: websiteUrl || undefined,
        githubRepo: activeProject?.repoUrl ?? undefined,
        analyticsProvider: onboarding?.analyticsConnected ? "Google Analytics" : undefined,
        searchConsoleStatus: onboarding?.analyticsConnected ? "pending" : "unknown",
        sslStatus: sslFromUrl(websiteUrl),
        deploymentStatus: activeProject?.status === "launched" ? "live" : "unknown",
        lastDeploymentDate: lastDeploy?.eventDate ?? undefined,
        internalNotes:
          "Auto-generated placeholder from client onboarding and project data. Review and complete.",
      };

      draft.infrastructureScore = calculateInfrastructureScore(draft);

      const created = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-infrastructure" as any,
        data: draft,
        overrideAccess: true,
      });

      existingClientIds.add(clientId);
      result.created++;

      try {
        await publishers.infrastructure.registryInitialized(
          {
            clientId,
            infrastructureId: created.id as number,
            primaryDomain: draft.primaryDomain ?? undefined,
          },
          payload,
        );
      } catch (err) {
        console.error("[KXD Infrastructure] Automation publish failed:", err);
      }

      if (onboarding?.hostingProvider || onboarding?.domainRegistrar) {
        const costs: InfraDoc[] = [];
        if (onboarding.domainRegistrar) {
          costs.push({
            client: clientId,
            infrastructure: created.id,
            name: "Domain registration",
            category: "domain",
            vendor: String(onboarding.domainRegistrar),
            amount: 0,
            billingCycle: "annual",
            paidBy: "unknown",
            active: true,
            notes: "Placeholder — set actual amount in Payload.",
          });
        }
        if (onboarding.hostingProvider) {
          costs.push({
            client: clientId,
            infrastructure: created.id,
            name: "Hosting",
            category: "hosting",
            vendor: String(onboarding.hostingProvider),
            amount: 0,
            billingCycle: "monthly",
            paidBy: "unknown",
            active: true,
            notes: "Placeholder — set actual amount in Payload.",
          });
        }

        const monthly = calculateMonthlyStackCost(costs);
        const annual = calculateAnnualStackCost(costs, created as InfraDoc);

        for (const cost of costs) {
          await payload.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "infrastructure-costs" as any,
            data: cost,
            overrideAccess: true,
          });
        }

        if (monthly > 0 || annual > 0) {
          await payload.update({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: "client-infrastructure" as any,
            id: created.id as number,
            data: {
              monthlyStackCost: monthly || undefined,
              annualRenewalCost: annual || undefined,
            },
            overrideAccess: true,
          });
        }
      }
    } catch (err) {
      result.errors.push(
        `Client ${clientId}: ${err instanceof Error ? err.message : "create failed"}`,
      );
    }
  }

  return result;
}
