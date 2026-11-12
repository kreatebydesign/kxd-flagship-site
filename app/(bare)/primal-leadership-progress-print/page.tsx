import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrimalLeadershipProgressReport } from "@/components/ces/leadership-report";
import { PRIMAL_LEADERSHIP_PROGRESS_UPDATE } from "@/lib/ces/leadership-report";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPayloadAdminUser } from "@/lib/admin/auth";
import { canAccessPrimalLeadershipProgressPrint } from "@/lib/portal/member-reports-access";
import { getPortalSession } from "@/lib/portal/session";
import { isStudioPayloadOperator } from "@/payload/access/index.ts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: PRIMAL_LEADERSHIP_PROGRESS_UPDATE.printDocumentTitle,
  robots: { index: false, follow: false },
};

/**
 * Print/PDF source for the Leadership Performance Update.
 * Authorization runs before any report HTML is rendered.
 */
export default async function PrimalLeadershipProgressPrintPage() {
  const session = await getPortalSession();
  const adminUser = await getPayloadAdminUser();
  const studioOperatorAuthenticated = Boolean(
    adminUser && isStudioPayloadOperator(adminUser),
  );

  let clientSlug: string | null = null;
  if (session && session.clientId > 0 && session.accessMode === "client") {
    const profile = await resolveExperienceProfile(session);
    clientSlug = profile.identity.clientSlug ?? null;
  }

  const authorized = canAccessPrimalLeadershipProgressPrint({
    portalSession: session
      ? {
          email: session.email,
          isOperatorPreview: session.isOperatorPreview,
          clientSlug,
          accessMode: session.accessMode === "partner" ? "partner" : "client",
        }
      : null,
    studioOperatorAuthenticated,
  });

  if (!authorized) {
    notFound();
  }

  return <PrimalLeadershipProgressReport report={PRIMAL_LEADERSHIP_PROGRESS_UPDATE} />;
}
