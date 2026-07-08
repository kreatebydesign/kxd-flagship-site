"use client";

import Link from "next/link";
import { useState } from "react";
import { OpsCard, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import {
  categoryDisplayLabel,
  confidenceDisplayLabel,
} from "@/lib/intelligence/briefings/display";
import type { IntelligentRecommendation } from "@/lib/intelligence/briefings/types";
import type { IntelligenceConfidence } from "@/lib/intelligence/types";

function confidenceVariant(confidence: IntelligenceConfidence): "success" | "default" | "warning" {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "default";
  return "warning";
}

export interface RecommendationCardProps {
  recommendation: IntelligentRecommendation;
  variant?: "primary" | "compact";
  showCta?: boolean;
}

export function RecommendationCard({
  recommendation,
  variant = "compact",
  showCta = true,
}: RecommendationCardProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const isPrimary = variant === "primary";

  return (
    <article
      className={`kxd-os-recommendation${isPrimary ? " kxd-os-recommendation--primary" : ""}`}
      aria-label={recommendation.title}
    >
      <OpsCard>
        <div className="kxd-os-recommendation__head">
          <div className="kxd-os-recommendation__labels">
            <span className="kxd-os-recommendation__category">
              {categoryDisplayLabel(recommendation.category)}
            </span>
            <OpsStatusBadge
              label={confidenceDisplayLabel(recommendation.signalConfidence)}
              variant={confidenceVariant(recommendation.signalConfidence)}
            />
          </div>
          <h3 className="kxd-os-recommendation__title">{recommendation.title}</h3>
        </div>

        <div className="kxd-os-recommendation__block">
          <p className="kxd-os-recommendation__block-label">Why this appeared</p>
          <p className="kxd-os-recommendation__block-text">{recommendation.whyAppeared}</p>
        </div>

        <div className="kxd-os-recommendation__facts">
          <div>
            <p className="kxd-os-recommendation__fact-label">Expected impact</p>
            <p className="kxd-os-recommendation__fact-text">{recommendation.expectedImpact}</p>
          </div>
          <div>
            <p className="kxd-os-recommendation__fact-label">Estimated effort</p>
            <p className="kxd-os-recommendation__fact-text">{recommendation.effort}</p>
          </div>
        </div>

        {recommendation.historyNotes.length > 0 ? (
          <ul className="kxd-os-recommendation__history">
            {recommendation.historyNotes.map((note) => (
              <li key={`${note.type}-${note.message}`}>{note.message}</li>
            ))}
          </ul>
        ) : null}

        {recommendation.evidence.length > 0 ? (
          <div className="kxd-os-recommendation__evidence">
            <button
              type="button"
              className="kxd-os-recommendation__evidence-toggle"
              aria-expanded={evidenceOpen}
              onClick={() => setEvidenceOpen((open) => !open)}
            >
              {evidenceOpen ? "Hide evidence" : `View evidence (${recommendation.evidence.length})`}
            </button>
            {evidenceOpen ? (
              <ul className="kxd-os-recommendation__evidence-list">
                {recommendation.evidence.map((item) => (
                  <li key={item.id}>
                    {item.href ? (
                      <Link href={item.href} className="kxd-os-recommendation__evidence-link">
                        <span className="kxd-os-recommendation__evidence-label">{item.label}</span>
                        {item.detail ? (
                          <span className="kxd-os-meta">{item.detail}</span>
                        ) : null}
                      </Link>
                    ) : (
                      <div>
                        <span className="kxd-os-recommendation__evidence-label">{item.label}</span>
                        {item.detail ? (
                          <span className="kxd-os-meta">{item.detail}</span>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {showCta && recommendation.href ? (
          <Link
            href={recommendation.href}
            className={`kxd-os-btn kxd-os-btn--primary kxd-os-recommendation__cta${isPrimary ? "" : " kxd-os-recommendation__cta--compact"}`}
          >
            Take action
          </Link>
        ) : null}
      </OpsCard>
    </article>
  );
}
