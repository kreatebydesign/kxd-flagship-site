import { KxdPage } from "@/components/os";
import { AnalyticsVisibilityWorkspace } from "@/components/portal/AnalyticsVisibilityWorkspace";
import type { AnalyticsVisibilityModel } from "@/lib/portal/analytics-visibility";
import { ClientHqPageHero } from "./ClientHqPageHero";

export function AnalyticsScreen({ model }: { model: AnalyticsVisibilityModel }) {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Intelligence"
        title="Analytics"
        lead={`Traffic, search, and tracked conversion signals for ${model.clientName} — this active account only.`}
      />
      <div className="kxd-ws-perf-wrap">
        <AnalyticsVisibilityWorkspace model={model} />
      </div>
    </KxdPage>
  );
}
