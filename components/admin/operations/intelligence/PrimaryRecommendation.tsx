import { OpsCard } from "@/components/admin/operations/shared/OpsBriefing";
import type { IntelligentRecommendation } from "@/lib/intelligence/briefings";
import { RecommendationCard } from "./RecommendationCard";

export function PrimaryRecommendation({
  recommendation,
}: {
  recommendation: IntelligentRecommendation | null;
}) {
  if (!recommendation) {
    return (
      <section
        className="kxd-os-intelligence-primary kxd-os-intelligence-primary--clear"
        aria-label="Primary recommendation"
      >
        <OpsCard>
          <p className="kxd-os-intelligence-primary__label">Primary Recommendation</p>
          <p className="kxd-os-intelligence-primary__title">No action required right now.</p>
          <p className="kxd-os-intelligence-primary__reason">
            Operations are clear — nothing needs a decision before you move on.
          </p>
        </OpsCard>
      </section>
    );
  }

  return (
    <section className="kxd-os-intelligence-primary" aria-label="Primary recommendation">
      <p className="kxd-os-intelligence-primary__label">Primary Recommendation</p>
      <RecommendationCard recommendation={recommendation} variant="primary" />
    </section>
  );
}
