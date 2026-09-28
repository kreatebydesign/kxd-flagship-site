import { KxdPage } from "@/components/os";
import { AuthorizedPortfolioWorkspace } from "@/components/portal/AuthorizedPortfolioWorkspace";
import type { AuthorizedPortfolioModel } from "@/lib/portal/authorized-portfolio";
import { ClientHqPageHero } from "./ClientHqPageHero";

export function PortfolioScreen({ model }: { model: AuthorizedPortfolioModel }) {
  const count = model.overview.totals?.siteCount ?? model.sites.length;
  const lead =
    model.availability === "ready"
      ? `How your ${count} businesses are doing — work, reporting, and anything waiting on you. Open a business to go deeper.`
      : model.emptyState.lead;

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="All Businesses"
        title="Your business portfolio"
        lead={lead}
        presence
      />
      <div className="kxd-ws-perf-wrap">
        <AuthorizedPortfolioWorkspace model={model} />
      </div>
    </KxdPage>
  );
}
