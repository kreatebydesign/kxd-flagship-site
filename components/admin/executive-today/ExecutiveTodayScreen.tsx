import Link from "next/link";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import type { ExecutiveTodayData } from "@/lib/executive-today";
import { formatClock } from "@/lib/executive-today/brief/time-model";
import { ExecutiveTodayCapture } from "./ExecutiveTodayCapture";

/**
 * Permanent Executive Today home — typography-first, decision-first.
 * Phase 22B visual refinement · Phase 27B calendar intelligence.
 */
export function ExecutiveTodayScreen({ data }: { data: ExecutiveTodayData }) {
  const brief = data.brief;
  const primaryClass =
    data.primary.from === "calm"
      ? "kxd-exec-today__primary kxd-exec-today__primary--calm"
      : "kxd-exec-today__primary";

  const tz = brief?.bounds.timeZone ?? "America/Los_Angeles";

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="today">
        <article className="kxd-exec-today">
          <header className="kxd-exec-today__hero kxd-exec-today__enter">
            <p className="kxd-exec-today__greeting">{data.greeting}</p>
            <h1 className="kxd-exec-today__headline">Today</h1>
            <p className="kxd-exec-today__welcome">
              {brief?.orientationSummary ?? data.welcome}
            </p>
            <p className="kxd-exec-today__meta">
              {data.dateDisplay}
              <span aria-hidden> · </span>
              {data.timeDisplay}
              {brief ? (
                <>
                  <span aria-hidden> · </span>
                  <span className="kxd-exec-today__orientation">
                    {brief.orientation.replace(/_/g, " ")}
                  </span>
                </>
              ) : null}
            </p>
            {brief?.current.happeningNow || brief?.current.nextCommitment ? (
              <p className="kxd-exec-today__now">
                {brief.current.happeningNow
                  ? `Now · ${brief.current.happeningNow}`
                  : brief.current.nextCommitment
                    ? `Next · ${brief.current.nextCommitment}`
                    : null}
                {brief.current.minutesRemaining != null
                  ? ` · ${brief.current.minutesRemaining}m left`
                  : brief.current.nextStartsInMinutes != null
                    ? ` · in ${brief.current.nextStartsInMinutes}m`
                    : null}
              </p>
            ) : null}
            {brief?.freshness ? (
              <p className="kxd-exec-today__freshness">{brief.freshness.label}</p>
            ) : null}
          </header>

          <section
            className={`kxd-exec-today__section kxd-exec-today__section--primary kxd-exec-today__enter kxd-exec-today__enter--1 ${primaryClass}`}
            aria-labelledby="today-primary"
          >
            <h2 id="today-primary" className="kxd-exec-today__label">
              Do this next
            </h2>
            <p className="kxd-exec-today__primary-title">{data.primary.title}</p>
            <p className="kxd-exec-today__primary-detail">{data.primary.detail}</p>
            <p className="kxd-exec-today__reason">{data.primary.reason}</p>
            {brief?.recommendation.evidence?.length ? (
              <ul className="kxd-exec-today__evidence">
                {brief.recommendation.evidence.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {data.primary.href ? (
              <p className="kxd-exec-today__link kxd-exec-today__link--primary">
                <Link href={data.primary.href}>
                  {data.primary.hrefLabel ?? "Continue"}
                </Link>
              </p>
            ) : null}
          </section>

          {brief && brief.dayFlow.length > 0 ? (
            <section
              className="kxd-exec-today__section kxd-exec-today__section--flow kxd-exec-today__enter kxd-exec-today__enter--2"
              aria-labelledby="today-flow"
            >
              <h2 id="today-flow" className="kxd-exec-today__label">
                Day flow
              </h2>
              <ol className="kxd-exec-today__flow">
                {brief.dayFlow.map((item) => {
                  const rowClass = [
                    "kxd-exec-today__flow-item",
                    `kxd-exec-today__flow-item--${item.state}`,
                    `kxd-exec-today__flow-item--${item.kind}`,
                  ].join(" ");
                  const timeLabel = item.allDay
                    ? "All day"
                    : item.startIso && item.endIso
                      ? `${formatClock(item.startIso, tz)} – ${formatClock(item.endIso, tz)}`
                      : item.startIso
                        ? formatClock(item.startIso, tz)
                        : "—";
                  const body = (
                    <>
                      <span className="kxd-exec-today__flow-time">{timeLabel}</span>
                      <span className="kxd-exec-today__flow-main">
                        <span className="kxd-exec-today__flow-title">{item.title}</span>
                        {item.detail ? (
                          <span className="kxd-exec-today__flow-detail">{item.detail}</span>
                        ) : null}
                      </span>
                      {item.durationMinutes != null && !item.allDay ? (
                        <span className="kxd-exec-today__flow-dur">
                          {item.durationMinutes}m
                        </span>
                      ) : null}
                    </>
                  );
                  const href = item.workHref ?? item.calendarHtmlLink;
                  return (
                    <li key={item.id} className={rowClass}>
                      {href ? (
                        <Link
                          href={href}
                          className="kxd-exec-today__flow-link"
                          target={item.calendarHtmlLink && !item.workHref ? "_blank" : undefined}
                          rel={item.calendarHtmlLink && !item.workHref ? "noreferrer" : undefined}
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="kxd-exec-today__flow-link">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          {brief && brief.attention.length > 0 ? (
            <section
              className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--3"
              aria-labelledby="today-attention"
            >
              <h2 id="today-attention" className="kxd-exec-today__label">
                Needs judgment
              </h2>
              <ul className="kxd-exec-today__list">
                {brief.attention.map((item) => (
                  <li key={item.id}>
                    {item.href ? (
                      <Link href={item.href} className="kxd-exec-today__row kxd-exec-today__row--notable">
                        <span className="kxd-exec-today__row-title">{item.title}</span>
                        <span className="kxd-exec-today__row-meta">{item.evidence}</span>
                      </Link>
                    ) : (
                      <div className="kxd-exec-today__row kxd-exec-today__row--notable">
                        <span className="kxd-exec-today__row-title">{item.title}</span>
                        <span className="kxd-exec-today__row-meta">{item.evidence}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {brief ? (
            <section
              className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--4"
              aria-labelledby="today-capacity"
            >
              <h2 id="today-capacity" className="kxd-exec-today__label">
                Remaining day
              </h2>
              <p className="kxd-exec-today__intel-headline">{brief.capacity.summary}</p>
              <p className="kxd-exec-today__intel-summary">
                {brief.capacity.capacityConfidence === "unknown"
                  ? "Duration estimates are incomplete — capacity is directional, not precise."
                  : brief.capacity.capacityConfidence === "partial"
                    ? "Some Work lacks duration estimates — treat capacity as partial."
                    : null}
              </p>
            </section>
          ) : null}

          <section
            className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--5"
            aria-labelledby="today-focus"
          >
            <div className="kxd-exec-today__section-head">
              <h2 id="today-focus" className="kxd-exec-today__label">
                Today&apos;s Work
              </h2>
              <Link href="/admin/work" className="kxd-exec-today__section-link">
                Work Engine
              </Link>
            </div>
            {data.focus.length === 0 ? (
              <p className="kxd-exec-today__empty">Nothing due or in motion for today.</p>
            ) : (
              <ul className="kxd-exec-today__list">
                {data.focus.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="kxd-exec-today__row">
                      <span className="kxd-exec-today__row-title">{item.title}</span>
                      <span className="kxd-exec-today__row-meta">{item.meta}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--6"
            aria-labelledby="today-activity"
          >
            <h2 id="today-activity" className="kxd-exec-today__label">
              What changed
            </h2>
            {data.activity.length === 0 ? (
              <p className="kxd-exec-today__empty">{data.activityEmptyMessage}</p>
            ) : (
              <ul className="kxd-exec-today__list">
                {data.activity.map((item) => {
                  const rowClass = [
                    "kxd-exec-today__row",
                    item.emphasis === "notable" ? "kxd-exec-today__row--notable" : "",
                    item.read ? "kxd-exec-today__row--read" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href} className={rowClass}>
                          <span className="kxd-exec-today__row-title">{item.title}</span>
                          <span className="kxd-exec-today__row-meta">{item.meta}</span>
                        </Link>
                      ) : (
                        <div className={rowClass}>
                          <span className="kxd-exec-today__row-title">{item.title}</span>
                          <span className="kxd-exec-today__row-meta">{item.meta}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            className="kxd-exec-today__section kxd-exec-today__section--capture kxd-exec-today__enter kxd-exec-today__enter--7"
            aria-labelledby="today-capture"
          >
            <h2 id="today-capture" className="kxd-exec-today__label">
              Quick Capture
            </h2>
            <ExecutiveTodayCapture />
          </section>

          {brief ? (
            <section
              className="kxd-exec-today__section kxd-exec-today__section--close kxd-exec-today__enter kxd-exec-today__enter--8"
              aria-labelledby="today-close"
            >
              <h2 id="today-close" className="kxd-exec-today__label">
                End of day
              </h2>
              <p className="kxd-exec-today__closing">{brief.closing.successLooksLike}</p>
            </section>
          ) : null}
        </article>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
