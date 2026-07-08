"use client";

import Link from "next/link";
import { useState } from "react";
import { insightToneLabel } from "@/lib/intelligence/briefings/display";
import type { ExecutiveInsight } from "@/lib/intelligence/briefings/types";

function InsightIcon({ tone }: { tone: ExecutiveInsight["tone"] }) {
  const className = `kxd-os-insight__icon kxd-os-insight__icon--${tone}`;
  return (
    <span className={className} aria-hidden>
      {tone === "positive" ? "↑" : tone === "quiet" ? "·" : "○"}
    </span>
  );
}

function InsightCard({ insight }: { insight: ExecutiveInsight }) {
  const [contextOpen, setContextOpen] = useState(false);

  return (
    <article className={`kxd-os-insight kxd-os-insight--${insight.tone}`}>
      <div className="kxd-os-insight__head">
        <InsightIcon tone={insight.tone} />
        <div className="kxd-os-insight__meta">
          <span className="kxd-os-insight__tone">{insightToneLabel(insight.tone)}</span>
          <span className="kxd-os-insight__time">{insight.timeframe}</span>
        </div>
      </div>

      <p className="kxd-os-insight__observation">{insight.observation}</p>

      {insight.confidence ? (
        <p className="kxd-os-insight__confidence">
          {insight.confidence === "high"
            ? "High confidence"
            : insight.confidence === "medium"
              ? "Medium confidence"
              : "Low confidence"}
        </p>
      ) : null}

      {insight.context.length > 0 ? (
        <div className="kxd-os-insight__context-wrap">
          <button
            type="button"
            className="kxd-os-insight__context-toggle"
            aria-expanded={contextOpen}
            onClick={() => setContextOpen((open) => !open)}
          >
            {contextOpen ? "Hide context" : "Supporting context"}
          </button>
          {contextOpen ? (
            <div className="kxd-os-insight__context">
              <p className="kxd-os-insight__context-line">
                <span>What changed</span> {insight.whatChanged}
              </p>
              <p className="kxd-os-insight__context-line">
                <span>Why it matters</span> {insight.whyItMatters}
              </p>
              <ul className="kxd-os-insight__signals">
                {insight.context.map((item) => (
                  <li key={item.id}>
                    {item.href ? (
                      <Link href={item.href} className="kxd-os-insight__signal-link">
                        {item.label}
                        {item.detail ? ` · ${item.detail}` : ""}
                      </Link>
                    ) : (
                      <span>
                        {item.label}
                        {item.detail ? ` · ${item.detail}` : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function ExecutiveInsights({
  insights,
  variant = "default",
}: {
  insights: ExecutiveInsight[];
  variant?: "default" | "ritual";
}) {
  if (insights.length === 0) return null;

  const isRitual = variant === "ritual";

  return (
    <section
      className={`kxd-os-insights${isRitual ? " kxd-os-insights--ritual" : ""}`}
      aria-label="Executive insights"
    >
      <header className="kxd-os-insights__head">
        <h2 className="kxd-os-insights__title">
          {isRitual ? "What we noticed" : "Executive Insights"}
        </h2>
        {!isRitual ? (
          <p className="kxd-os-insights__lead">
            Observations from the portfolio — not tasks, just what KXD has noticed.
          </p>
        ) : (
          <p className="kxd-os-insights__lead">
            Quiet observations — not tasks, just context.
          </p>
        )}
      </header>
      <div className="kxd-os-insights__list">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </section>
  );
}
