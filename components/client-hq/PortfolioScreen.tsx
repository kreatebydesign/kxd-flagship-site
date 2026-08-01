import { KxdPage } from "@/components/os";
import { AuthorizedPortfolioWorkspace } from "@/components/portal/AuthorizedPortfolioWorkspace";
import type { AuthorizedPortfolioModel } from "@/lib/portal/authorized-portfolio";
import { ClientHqPageHero } from "./ClientHqPageHero";

export function PortfolioScreen({ model }: { model: AuthorizedPortfolioModel }) {
  const lead =
    model.availability === "ready"
      ? `A calm summary across ${model.overview.totals?.siteCount ?? model.sites.length} authorized accounts. Active context remains ${model.activeClientName}.`
      : model.emptyState.lead;

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Headquarters"
        title="Portfolio"
        lead={lead}
        presence
      />
      <div className="kxd-ws-perf-wrap">
        <AuthorizedPortfolioWorkspace model={model} />
      </div>
    </KxdPage>
  );
}
