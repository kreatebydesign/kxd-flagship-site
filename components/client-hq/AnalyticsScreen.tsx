import { CesPage } from "@/components/ces/primitives";
import { AnalyticsVisibilityWorkspace } from "@/components/portal/AnalyticsVisibilityWorkspace";
import type { AnalyticsVisibilityModel } from "@/lib/portal/analytics-visibility";

export function AnalyticsScreen({
  model,
  showReportsNavLink = true,
}: {
  model: AnalyticsVisibilityModel;
  showReportsNavLink?: boolean;
}) {
  return (
    <CesPage className="kxd-client-module kxd-client-module--analytics">
      <div className="kxd-ws-perf-wrap">
        <AnalyticsVisibilityWorkspace
          model={model}
          showReportsNavLink={showReportsNavLink}
        />
      </div>
    </CesPage>
  );
}
