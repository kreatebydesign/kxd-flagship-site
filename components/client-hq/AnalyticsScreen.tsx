import { CesHero, CesPage } from "@/components/ces/primitives";
import { AnalyticsVisibilityWorkspace } from "@/components/portal/AnalyticsVisibilityWorkspace";
import type { AnalyticsVisibilityModel } from "@/lib/portal/analytics-visibility";

export function AnalyticsScreen({ model }: { model: AnalyticsVisibilityModel }) {
  return (
    <CesPage className="kxd-client-module kxd-client-module--analytics">
      <CesHero
        eyebrow="Intelligence"
        title="Analytics"
        lead={`How people find and use ${model.clientName}'s website, translated into business language.`}
      />
      <div className="kxd-ws-perf-wrap">
        <AnalyticsVisibilityWorkspace model={model} />
      </div>
    </CesPage>
  );
}
