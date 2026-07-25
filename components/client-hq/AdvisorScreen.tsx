import { KxdIntelligenceCallout, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";

export function AdvisorScreen() {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Intelligence"
        title="Advisor"
        lead="Proactive recommendations for your business, website, and growth."
        presence
      />

      <KxdIntelligenceCallout
        title="KXD Intelligence is coming"
        description="Proactive recommendations, growth opportunities, website monitoring, and operational insights — tailored to your business. Available soon."
        aria-label="KXD Intelligence unavailable"
      />
    </KxdPage>
  );
}
