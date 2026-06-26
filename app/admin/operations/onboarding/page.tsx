/**
 * /admin/operations/onboarding
 * KXD OS — Client Onboarding System
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { OnboardingScreen, type OnboardingRow } from "@/components/admin/operations/onboarding/OnboardingScreen";
import {
  calculateOnboardingReadiness,
  getMissingClientRequirements,
  getOnboardingChecklists,
  getOnboardingWorkflowStatus,
  onboardingStatusLabel,
  onboardingWorkflowLabel,
} from "@/lib/client-onboarding";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function clientName(raw: unknown): string {
  if (!raw) return "Unknown";
  if (typeof raw === "object" && raw !== null && "name" in raw) {
    return ((raw as AnyDoc).name as string) || "Unknown";
  }
  return "Unknown";
}

function clientId(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return (raw as AnyDoc).id as number;
  }
  if (typeof raw === "number") return raw;
  return null;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default async function OnboardingDashboardPage() {
  const payload = await getPayload({ config });

  const onboardingsR = await Promise.allSettled([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-onboarding" as any,
      limit: 200,
      depth: 1,
      sort: "-updatedAt",
    }),
  ]);

  const onboardings =
    onboardingsR[0].status === "fulfilled"
      ? (onboardingsR[0].value.docs as AnyDoc[])
      : [];

  const rows: OnboardingRow[] = onboardings.map((doc) => {
    const readiness = calculateOnboardingReadiness(doc);
    const missing = getMissingClientRequirements(doc);
    const checklist = getOnboardingChecklists(doc);
    const workflow = getOnboardingWorkflowStatus(doc);
    const notes = doc.notes ? String(doc.notes).trim() : "";
    return {
      id: doc.id as number,
      clientId: clientId(doc.client),
      clientName: clientName(doc.client) || (doc.businessName as string) || "Unknown",
      status: String(doc.status ?? "draft"),
      statusLabel: onboardingStatusLabel(doc.status as string),
      workflow,
      workflowLabel: onboardingWorkflowLabel(workflow),
      readinessScore: readiness.score,
      readinessLabel: readiness.label,
      completionPercent: readiness.completionPercent,
      updatedAt: fmtDate(doc.updatedAt as string),
      notes,
      missingItems: missing.all,
      checklist: {
        assets: checklist.assets,
        domainDns: checklist.domainDns,
        brand: checklist.brand,
        content: checklist.content,
      },
    };
  });

  const total = rows.length;
  const workflowCounts = {
    waitingOnClient: rows.filter((row) => row.workflow === "waiting-on-client").length,
    waitingOnKxd: rows.filter((row) => row.workflow === "waiting-on-kxd").length,
    readyForBuild: rows.filter((row) => row.workflow === "ready-for-build").length,
    approved: rows.filter((row) => row.workflow === "approved").length,
  };

  const activeIntakes = rows
    .filter((row) => row.workflow !== "approved")
    .sort((a, b) => b.readinessScore - a.readinessScore)
    .slice(0, 6);

  const withMissing = rows
    .filter((row) => row.missingItems.length > 0)
    .sort((a, b) => b.missingItems.length - a.missingItems.length);

  const kpis = [
    {
      label: "Total Onboardings",
      value: String(total),
      sub: "all records",
    },
    {
      label: "Waiting on Client",
      value: String(workflowCounts.waitingOnClient),
      sub: "awaiting intake items",
      alert: workflowCounts.waitingOnClient > 0,
    },
    {
      label: "Waiting on KXD",
      value: String(workflowCounts.waitingOnKxd),
      sub: "internal action queue",
    },
    {
      label: "Ready for Build",
      value: String(workflowCounts.readyForBuild),
      sub: "cleared for delivery",
    },
    {
      label: "Approved",
      value: String(workflowCounts.approved),
      sub: "handoff complete",
    },
    {
      label: "Missing Requirements",
      value: String(withMissing.length),
      sub: "records with open dependencies",
      alert: withMissing.length > 0,
    },
  ];

  return (
    <OnboardingScreen
      total={total}
      kpis={kpis}
      activeIntakes={activeIntakes}
      missingIntakes={withMissing}
      allRows={rows}
    />
  );
}
