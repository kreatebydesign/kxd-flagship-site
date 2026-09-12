import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PrimalLeadershipReport } from "@/components/ces/leadership-report";
import { isCesModuleEnabled } from "@/lib/ces";
import {
  canAccessPrimalLeadershipReport,
  getPrimalLeadershipReportForClient,
} from "@/lib/ces/leadership-report";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Primal Motorsports | Digital Performance & Growth Report",
  description:
    "Primal Motorsports Digital Performance & Growth Report — post-launch baseline prepared by Kreate by Design.",
};

/**
 * Primal Client Experience → Partnership (Performance) → Leadership Report
 * Authorized Primal portal users and KXD operator preview only.
 */
export default async function PortalLeadershipReportPage() {
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

  const report = getPrimalLeadershipReportForClient(profile.identity.clientSlug);
  if (!report) notFound();

  return <PrimalLeadershipReport report={report} />;
}
