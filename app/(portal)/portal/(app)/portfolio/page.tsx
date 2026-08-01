import { redirect } from "next/navigation";
import { PortfolioScreen } from "@/components/client-hq";
import { resolvePortalAccountContext } from "@/lib/portal/account-context";
import { resolveAuthorizedPortfolio } from "@/lib/portal/authorized-portfolio/server";
import { resolvePortfolioAccess } from "@/lib/portal/portfolio";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

/**
 * Phase 4 Batch F — Authorized combined portfolio.
 * Single-account users are redirected to Overview (single-account equivalent).
 */
export default async function PortalPortfolioPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const accountContext = await resolvePortalAccountContext(session);
  const access = resolvePortfolioAccess(accountContext);

  // Single-account (and other unavailable) paths keep the existing Overview experience.
  if (!access.available) {
    redirect("/portal");
  }

  const model = await resolveAuthorizedPortfolio({
    session,
    accountContext,
  });

  if (model.availability !== "ready") {
    redirect("/portal");
  }

  return <PortfolioScreen model={model} />;
}
