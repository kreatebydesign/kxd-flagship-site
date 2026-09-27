import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  PrimalLeadershipProgressReport,
  PrimalLeadershipReport,
} from "@/components/ces/leadership-report";
import { isCesModuleEnabled } from "@/lib/ces";
import {
  canAccessPrimalLeadershipReport,
  getPrimalLeadershipReportEntryForClient,
} from "@/lib/ces/leadership-report";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Primal Motorsports | Digital Performance & Growth Update",
  description:
    "Primal Motorsports Digital Performance & Growth Update — leadership performance review prepared by Kreate by Design.",
};

/**
 * Primal Client Experience → Partnership (Performance) → Leadership Report
 * Authorized Primal portal users and KXD operator preview only.
 * Default: latest published report. Archive via ?id=
 */
export default async function PortalLeadershipReportPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  const entitled = isCesModuleEnabled(profile, "executive-performance");

  if (
    !canAccessPrimalLeadershipReport({
      clientSlug: profile.identity.clientSlug,
      executivePerformanceEnabled: entitled,
    })
  ) {
    // Uniform denial — do not reveal that a Primal-specific report exists.
    notFound();
  }

  const params = await searchParams;
  const entry = getPrimalLeadershipReportEntryForClient(
    profile.identity.clientSlug,
    params.id,
  );
  if (!entry) notFound();

  if (entry.kind === "progress-update" && entry.progress) {
    return <PrimalLeadershipProgressReport report={entry.progress} />;
  }

  if (entry.kind === "baseline" && entry.baseline) {
    return <PrimalLeadershipReport report={entry.baseline} />;
  }

  notFound();
}
