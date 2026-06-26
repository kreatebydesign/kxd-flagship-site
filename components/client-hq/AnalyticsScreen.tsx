import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";

export function AnalyticsScreen({ analyticsConnected }: { analyticsConnected: boolean }) {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Intelligence"
        title="Analytics"
        lead="Traffic, conversions, and growth signals for your digital presence."
      />

      {analyticsConnected ? (
        <div className="kxd-os-card">
          <p className="kxd-os-section__label">Analytics connected</p>
          <p className="kxd-os-body" style={{ marginTop: "0.75rem" }}>
            Your analytics account is on file. Detailed reporting and dashboards are coming in a
            future release.
          </p>
        </div>
      ) : (
        <KxdEmptyState
          title="Analytics not connected"
          description="Connect Google Analytics or ask your KXD team to configure reporting. Live dashboards are planned for a future release."
        />
      )}
    </KxdPage>
  );
}
