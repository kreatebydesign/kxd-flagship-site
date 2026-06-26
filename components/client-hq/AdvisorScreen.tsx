import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";

export function AdvisorScreen() {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Intelligence"
        title="AI Advisor"
        lead="Proactive recommendations for your business, website, and growth."
        presence
      />

      <KxdEmptyState
        title="KXD Intelligence is coming"
        description="KXD Intelligence will soon provide proactive recommendations, growth opportunities, website monitoring, and operational insights — tailored to your business."
      />
    </KxdPage>
  );
}
