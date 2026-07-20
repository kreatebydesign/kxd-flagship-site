"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type {
  ExecutiveReviewChart,
  ExecutiveReviewPack,
  ExecutiveReviewStatus,
} from "@/lib/ces/executive-review";

export type CesExecutiveReviewProps = {
  pack: ExecutiveReviewPack;
};

function statusLabel(status: ExecutiveReviewStatus): string {
  if (status === "built") return "Built";
  if (status === "in-progress") return "In Progress";
  return "Future";
}

function StatusTag({ status }: { status: ExecutiveReviewStatus }) {
  return (
    <span className={`kxd-ces-review__status kxd-ces-review__status--${status}`}>
      {statusLabel(status)}
    </span>
  );
}

function Takeaway({ children }: { children: string }) {
  return (
    <aside className="kxd-ces-review__takeaway" aria-label="Executive takeaway">
      <p className="kxd-ces-review__takeaway-label">Executive takeaway</p>
      <p className="kxd-ces-review__takeaway-body">{children}</p>
    </aside>
  );
}

function DualSeriesChart({ chart }: { chart: ExecutiveReviewChart }) {
  const width = 560;
  const height = 200;
  const padX = 36;
  const padY = 28;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;
  const maxPrimary = Math.max(...chart.points.map((p) => p.value), 1);
  const maxSecondary = Math.max(
    ...chart.points.map((p) => p.secondary ?? 0),
    1,
  );
  const n = chart.points.length;

  const primaryPoints = chart.points.map((point, i) => {
    const x = padX + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = padY + plotH - (point.value / maxPrimary) * plotH;
    return { x, y, point };
  });

  const secondaryPoints = chart.points.map((point, i) => {
    const x = padX + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const secondary = point.secondary ?? 0;
    const y = padY + plotH - (secondary / maxSecondary) * plotH;
    return { x, y, value: secondary };
  });

  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <figure className="kxd-ces-review__chart">
      <figcaption className="kxd-ces-review__chart-head">
        <span className="kxd-ces-review__chart-title">{chart.title}</span>
        <span className="kxd-ces-review__chart-period">{chart.periodLabel}</span>
      </figcaption>
      <p className="kxd-ces-review__chart-summary">{chart.summary}</p>
      <svg
        className="kxd-ces-review__chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={chart.summary}
      >
        <line
          x1={padX}
          y1={padY + plotH}
          x2={padX + plotW}
          y2={padY + plotH}
          className="kxd-ces-review__chart-axis"
        />
        <path d={toPath(primaryPoints)} className="kxd-ces-review__chart-line" fill="none" />
        {chart.secondaryLabel ? (
          <path
            d={toPath(secondaryPoints)}
            className="kxd-ces-review__chart-line kxd-ces-review__chart-line--secondary"
            fill="none"
          />
        ) : null}
        {primaryPoints.map((p) => (
          <circle
            key={`p-${p.point.label}`}
            cx={p.x}
            cy={p.y}
            r="3.5"
            className="kxd-ces-review__chart-dot"
          />
        ))}
        {chart.secondaryLabel
          ? secondaryPoints.map((p, i) => (
              <circle
                key={`s-${chart.points[i].label}`}
                cx={p.x}
                cy={p.y}
                r="3"
                className="kxd-ces-review__chart-dot kxd-ces-review__chart-dot--secondary"
              />
            ))
          : null}
        {primaryPoints.map((p) => (
          <text
            key={`l-${p.point.label}`}
            x={p.x}
            y={height - 6}
            textAnchor="middle"
            className="kxd-ces-review__chart-label"
          >
            {p.point.label}
          </text>
        ))}
      </svg>
      <ul className="kxd-ces-review__chart-legend">
        <li>
          <span className="kxd-ces-review__chart-swatch" aria-hidden="true" />
          {chart.primaryLabel}
        </li>
        {chart.secondaryLabel ? (
          <li>
            <span
              className="kxd-ces-review__chart-swatch kxd-ces-review__chart-swatch--secondary"
              aria-hidden="true"
            />
            {chart.secondaryLabel}
          </li>
        ) : null}
      </ul>
    </figure>
  );
}

function chapterById(pack: ExecutiveReviewPack, id: string) {
  return pack.chapters.find((c) => c.id === id)!;
}

export function CesExecutiveReview({ pack }: CesExecutiveReviewProps) {
  const style = {
    "--kxd-ces-review-hero-image": `url(${pack.heroImageSrc})`,
  } as CSSProperties;

  const opening = chapterById(pack, "opening");
  const foundation = chapterById(pack, "foundation");
  const platform = chapterById(pack, "platform");
  const demand = chapterById(pack, "demand");
  const workspace = chapterById(pack, "workspace");
  const impact = chapterById(pack, "impact");
  const roadmap = chapterById(pack, "roadmap");
  const vision = chapterById(pack, "vision");

  return (
    <div className="kxd-ces-review" style={style}>
      <nav className="kxd-ces-review__rail" aria-label="Review chapters">
        <p className="kxd-ces-review__rail-label">Chapters</p>
        <ol className="kxd-ces-review__rail-list">
          {pack.chapters.map((chapter, index) => (
            <li key={chapter.id}>
              <a href={`#review-${chapter.id}`}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {chapter.railLabel}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="kxd-ces-review__mobile-jump">
        <label htmlFor="kxd-ces-review-jump">Jump to chapter</label>
        <select
          id="kxd-ces-review-jump"
          defaultValue=""
          onChange={(event) => {
            const value = event.target.value;
            if (!value) return;
            const el = document.getElementById(value);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
            event.target.value = "";
          }}
        >
          <option value="" disabled>
            Select a chapter
          </option>
          {pack.chapters.map((chapter, index) => (
            <option key={chapter.id} value={`review-${chapter.id}`}>
              {String(index + 1).padStart(2, "0")} · {chapter.railLabel}
            </option>
          ))}
        </select>
      </div>

      <article className="kxd-ces-review__article">
        <header
          id="review-opening"
          className="kxd-ces-review__hero"
          aria-labelledby="review-opening-title"
        >
          <div className="kxd-ces-review__hero-veil" aria-hidden="true" />
          <div className="kxd-ces-review__hero-inner">
            <p className="kxd-ces-review__eyebrow">
              {pack.opening.eyebrow} · {pack.opening.headline}
            </p>
            <h1 id="review-opening-title" className="kxd-ces-review__brand">
              {pack.opening.brand}
            </h1>
            <p className="kxd-ces-review__lead">{pack.opening.lead}</p>
            <p className="kxd-ces-review__context">{pack.opening.contextLine}</p>
            <dl className="kxd-ces-review__glance">
              <div>
                <dt>Phase</dt>
                <dd>{pack.opening.glance.phase}</dd>
              </div>
              <div>
                <dt>Focus</dt>
                <dd>{pack.opening.glance.focus}</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>{pack.opening.glance.next}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{pack.opening.glance.updated}</dd>
              </div>
            </dl>
            <ul className="kxd-ces-review__legend" aria-label="Status legend">
              <li>
                <StatusTag status="built" /> Built
              </li>
              <li>
                <StatusTag status="in-progress" /> In Progress
              </li>
              <li>
                <StatusTag status="future" /> Future
              </li>
            </ul>
            <p className="kxd-ces-review__period">{pack.periodLabel}</p>
          </div>
        </header>

        <section className="kxd-ces-review__section" aria-labelledby="review-opening-heading">
          <p className="kxd-ces-review__section-eyebrow">{opening.eyebrow}</p>
          <h2 id="review-opening-heading" className="kxd-ces-review__heading">
            {opening.title}
          </h2>
          <p className="kxd-ces-review__section-lead">{opening.lead}</p>
          {opening.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-review__prose">
              {paragraph}
            </p>
          ))}
          <Takeaway>{opening.takeaway}</Takeaway>

          <ol className="kxd-ces-review__timeline" aria-label="Partnership journey">
            {pack.timeline.map((step) => (
              <li
                key={step.id}
                className={
                  step.current
                    ? "kxd-ces-review__timeline-step kxd-ces-review__timeline-step--current"
                    : "kxd-ces-review__timeline-step"
                }
              >
                <span className="kxd-ces-review__timeline-node" aria-hidden="true" />
                <span className="kxd-ces-review__timeline-label">{step.label}</span>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="review-foundation"
          className="kxd-ces-review__section"
          aria-labelledby="review-foundation-heading"
        >
          <p className="kxd-ces-review__section-eyebrow">{foundation.eyebrow}</p>
          <h2 id="review-foundation-heading" className="kxd-ces-review__heading">
            {foundation.title}
          </h2>
          <p className="kxd-ces-review__section-lead">{foundation.lead}</p>
          {foundation.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-review__prose">
              {paragraph}
            </p>
          ))}
          <ol className="kxd-ces-review__pillars">
            {pack.pillars.map((pillar) => (
              <li key={pillar.id}>
                <span className="kxd-ces-review__pillar-num" aria-hidden="true">
                  {pillar.number}
                </span>
                <div>
                  <div className="kxd-ces-review__pillar-head">
                    <h3>{pillar.title}</h3>
                    <StatusTag status={pillar.status} />
                  </div>
                  <p>{pillar.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Takeaway>{foundation.takeaway}</Takeaway>
        </section>

        <section
          id="review-platform"
          className="kxd-ces-review__section"
          aria-labelledby="review-platform-heading"
        >
          <p className="kxd-ces-review__section-eyebrow">{platform.eyebrow}</p>
          <h2 id="review-platform-heading" className="kxd-ces-review__heading">
            {platform.title}
          </h2>
          <p className="kxd-ces-review__section-lead">{platform.lead}</p>
          {platform.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-review__prose">
              {paragraph}
            </p>
          ))}

          <div className="kxd-ces-review__journey">
            <h3 className="kxd-ces-review__journey-title">{pack.journey.title}</h3>
            <p className="kxd-ces-review__journey-lead">{pack.journey.lead}</p>
            <div className="kxd-ces-review__journey-grid">
              {[pack.journey.before, pack.journey.today].map((column) => (
                <div key={column.id} className="kxd-ces-review__journey-col">
                  <h4>{column.title}</h4>
                  <ul>
                    {column.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="kxd-ces-review__frames">
            {pack.platformFrames.map((frame) => (
              <figure key={frame.id} className="kxd-ces-review__frame">
                <div className="kxd-ces-review__frame-meta">
                  {frame.label ? (
                    <span className="kxd-ces-review__frame-label">{frame.label}</span>
                  ) : null}
                  {frame.status ? <StatusTag status={frame.status} /> : null}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frame.src} alt={frame.alt} loading="lazy" />
                <figcaption>{frame.caption}</figcaption>
              </figure>
            ))}
          </div>
          <Takeaway>{platform.takeaway}</Takeaway>
        </section>

        <section
          id="review-demand"
          className="kxd-ces-review__section"
          aria-labelledby="review-demand-heading"
        >
          <p className="kxd-ces-review__section-eyebrow">{demand.eyebrow}</p>
          <h2 id="review-demand-heading" className="kxd-ces-review__heading">
            {demand.title}
          </h2>
          <p className="kxd-ces-review__section-lead">{demand.lead}</p>
          {demand.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-review__prose">
              {paragraph}
            </p>
          ))}

          <div className="kxd-ces-review__highlight">
            <p className="kxd-ces-review__highlight-label">{pack.demand.highlight.title}</p>
            <p className="kxd-ces-review__highlight-value">{pack.demand.highlight.value}</p>
            <p className="kxd-ces-review__highlight-note">{pack.demand.highlight.note}</p>
            <ul className="kxd-ces-review__metrics kxd-ces-review__metrics--support">
              {pack.demand.supportingMetrics.map((metric) => (
                <li key={metric.id}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  {metric.note ? <em>{metric.note}</em> : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="kxd-ces-review__evidence-grid">
            {[pack.demand.advertising, pack.demand.search].map((panel) => (
              <div key={panel.id} className="kxd-ces-review__evidence">
                <div className="kxd-ces-review__evidence-head">
                  <h3>{panel.title}</h3>
                  <span className="kxd-ces-review__provenance">{panel.provenanceLabel}</span>
                </div>
                <p className="kxd-ces-review__evidence-lead">{panel.lead}</p>
                <ul className="kxd-ces-review__metrics">
                  {panel.metrics.map((metric) => (
                    <li key={metric.id}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                      {metric.note ? <em>{metric.note}</em> : null}
                    </li>
                  ))}
                </ul>
                {panel.themes && panel.themes.length > 0 ? (
                  <ul className="kxd-ces-review__themes" aria-label={`${panel.title} intent themes`}>
                    {panel.themes.map((theme) => (
                      <li key={theme}>{theme}</li>
                    ))}
                  </ul>
                ) : null}
                {panel.note ? <p className="kxd-ces-review__note">{panel.note}</p> : null}
                {panel.chart ? (
                  <div className="kxd-ces-review__chart-support">
                    <DualSeriesChart chart={panel.chart} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="kxd-ces-review__domain">
            <h3>{pack.demand.domainStory.title}</h3>
            <p>{pack.demand.domainStory.body}</p>
            <dl>
              <div>
                <dt>{pack.demand.domainStory.primary.domain}</dt>
                <dd>{pack.demand.domainStory.primary.note}</dd>
              </div>
              <div>
                <dt>{pack.demand.domainStory.legacy.domain}</dt>
                <dd>{pack.demand.domainStory.legacy.note}</dd>
              </div>
            </dl>
          </div>

          <div className="kxd-ces-review__empty" role="status">
            <p className="kxd-ces-review__empty-label">
              Website analytics <StatusTag status="in-progress" />
            </p>
            <p>{pack.demand.analyticsEmpty}</p>
          </div>

          <Takeaway>{demand.takeaway}</Takeaway>
        </section>

        <section
          id="review-workspace"
          className="kxd-ces-review__section"
          aria-labelledby="review-workspace-heading"
        >
          <p className="kxd-ces-review__section-eyebrow">{workspace.eyebrow}</p>
          <h2 id="review-workspace-heading" className="kxd-ces-review__heading">
            {workspace.title}
          </h2>
          <p className="kxd-ces-review__section-lead">{workspace.lead}</p>
          {workspace.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-review__prose">
              {paragraph}
            </p>
          ))}
          <div className="kxd-ces-review__capabilities">
            {pack.capabilities.map((capability) => (
              <article key={capability.id} className="kxd-ces-review__capability">
                <div className="kxd-ces-review__capability-copy">
                  <div className="kxd-ces-review__pillar-head">
                    <h3>{capability.title}</h3>
                    <StatusTag status={capability.status} />
                  </div>
                  <p>{capability.outcome}</p>
                  <Link href={capability.href} className="kxd-ces-btn kxd-ces-btn--ghost">
                    {capability.hrefLabel}
                  </Link>
                </div>
                <figure className="kxd-ces-review__capability-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capability.media.src}
                    alt={capability.media.alt}
                    loading="lazy"
                  />
                  <figcaption>{capability.media.caption}</figcaption>
                </figure>
              </article>
            ))}
          </div>
          <Takeaway>{workspace.takeaway}</Takeaway>
        </section>

        <section
          id="review-impact"
          className="kxd-ces-review__section"
          aria-labelledby="review-impact-heading"
        >
          <p className="kxd-ces-review__section-eyebrow">{impact.eyebrow}</p>
          <h2 id="review-impact-heading" className="kxd-ces-review__heading">
            {impact.title}
          </h2>
          <p className="kxd-ces-review__section-lead">{impact.lead}</p>
          {impact.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-review__prose">
              {paragraph}
            </p>
          ))}
          <div className="kxd-ces-review__engines">
            {pack.engines.map((engine) => (
              <div key={engine.id} className="kxd-ces-review__engine">
                <h3>{engine.title}</h3>
                <p>{engine.body}</p>
              </div>
            ))}
          </div>
          <div className="kxd-ces-review__ongoing">
            <div className="kxd-ces-review__pillar-head">
              <h3>{pack.ongoingWork.title}</h3>
              <StatusTag status={pack.ongoingWork.status} />
            </div>
            <p>{pack.ongoingWork.body}</p>
            <ul className="kxd-ces-review__ongoing-list">
              {pack.ongoingWork.items.map((item) => (
                <li key={item.id}>
                  <span className="kxd-ces-review__ongoing-mark" aria-hidden="true">
                    ✓
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
          <Takeaway>{impact.takeaway}</Takeaway>
        </section>

        <section
          id="review-roadmap"
          className="kxd-ces-review__section"
          aria-labelledby="review-roadmap-heading"
        >
          <p className="kxd-ces-review__section-eyebrow">{roadmap.eyebrow}</p>
          <h2 id="review-roadmap-heading" className="kxd-ces-review__heading">
            {roadmap.title}
          </h2>
          <p className="kxd-ces-review__section-lead">{roadmap.lead}</p>
          {roadmap.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-review__prose">
              {paragraph}
            </p>
          ))}
          <div className="kxd-ces-review__lanes">
            {pack.roadmapLanes.map((lane) => (
              <div key={lane.id} className="kxd-ces-review__lane">
                <h3>{lane.title}</h3>
                <ul>
                  {lane.items.map((item) => (
                    <li key={item.id}>
                      <div className="kxd-ces-review__pillar-head">
                        <strong>{item.title}</strong>
                        <StatusTag status={item.status} />
                      </div>
                      <p>{item.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Takeaway>{roadmap.takeaway}</Takeaway>
        </section>

        <section
          id="review-vision"
          className="kxd-ces-review__section kxd-ces-review__section--close"
          aria-labelledby="review-vision-heading"
        >
          <p className="kxd-ces-review__section-eyebrow">{vision.eyebrow}</p>
          <h2 id="review-vision-heading" className="kxd-ces-review__heading">
            {vision.title}
          </h2>
          <p className="kxd-ces-review__section-lead">{vision.lead}</p>
          {vision.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-review__prose">
              {paragraph}
            </p>
          ))}
          <div className="kxd-ces-review__rings">
            {pack.vision.rings.map((ring) => (
              <div key={ring.id} className="kxd-ces-review__ring">
                <div className="kxd-ces-review__pillar-head">
                  <h3>{ring.label}</h3>
                  <StatusTag status={ring.status} />
                </div>
                <p>{ring.body}</p>
              </div>
            ))}
          </div>
          <figure className="kxd-ces-review__future-media">
            <div className="kxd-ces-review__frame-meta">
              <span className="kxd-ces-review__frame-label">
                {pack.vision.futureMedia.label}
              </span>
              {pack.vision.futureMedia.status ? (
                <StatusTag status={pack.vision.futureMedia.status} />
              ) : null}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pack.vision.futureMedia.src}
              alt={pack.vision.futureMedia.alt}
              loading="lazy"
            />
            <figcaption>{pack.vision.futureMedia.caption}</figcaption>
          </figure>
          <p className="kxd-ces-review__close">{pack.vision.close}</p>
          <Takeaway>{vision.takeaway}</Takeaway>
          <div className="kxd-ces-review__actions">
            <Link href="/portal" className="kxd-ces-btn kxd-ces-btn--primary">
              Back to Overview
            </Link>
            <Link href="/portal/partnership" className="kxd-ces-btn kxd-ces-btn--ghost">
              Open Partnership
            </Link>
            <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--ghost">
              Continue Website Review
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
