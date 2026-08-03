import Link from "next/link";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { WhyThisDisclosure } from "@/components/admin/executive-intelligence/WhyThisDisclosure";
import type { ExecutiveTodayData } from "@/lib/executive-today";
import {
  TODAY_EMPTY,
  TODAY_EVIDENCE_LIMIT,
  TODAY_EXCEPTIONS_LIMIT,
  TODAY_PRIORITIES_LIMIT,
  TODAY_QUIET_EXITS,
  TODAY_SIGNALS_LIMIT,
  selectTodaySchedule,
} from "@/lib/executive-today/presentation";
import { formatClock } from "@/lib/executive-today/brief/time-model";

/**
 * Today — sole founder home.
 * Phase 7 Batch D: Batch A section model, confidence over density.
 *
 * Order: Orientation → Do This First → Priorities → Schedule →
 * Needs Judgment (conditional) → What Changed → Quiet exits.
 */
export function ExecutiveTodayScreen({ data }: { data: ExecutiveTodayData }) {
  const brief = data.brief;
  const tz = brief?.bounds.timeZone ?? "America/Los_Angeles";
  const isCalm = data.primary.from === "calm";
  const posture =
    brief?.orientationSummary ??
    data.intelligence.summary ??
    data.welcome;
  const scheduleItems = brief ? selectTodaySchedule(brief.dayFlow) : [];
  const exceptions = (brief?.attention ?? []).slice(0, TODAY_EXCEPTIONS_LIMIT);
  const priorities = data.focus.slice(0, TODAY_PRIORITIES_LIMIT);
  const signals = data.activity.slice(0, TODAY_SIGNALS_LIMIT);
  const evidence = (brief?.recommendation.evidence ?? []).slice(
    0,
    TODAY_EVIDENCE_LIMIT,
  );

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="today">
        <article className="kxd-exec-today" aria-label="Today">
          {/* 1 — Orientation */}
          <header className="kxd-exec-today__hero kxd-exec-today__enter">
            <p className="kxd-exec-today__greeting">{data.greeting}</p>
            <h1 className="kxd-exec-today__headline">Today</h1>
            <p className="kxd-exec-today__posture">{posture}</p>
            <p className="kxd-exec-today__meta">
              <time dateTime={data.generatedAt}>{data.dateDisplay}</time>
              <span aria-hidden> · </span>
              <span>{data.timeDisplay}</span>
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
          </header>

          {/* 2 — Do This First */}
          <section
            className={[
              "kxd-exec-today__section",
              "kxd-exec-today__section--primary",
              "kxd-exec-today__enter",
              "kxd-exec-today__enter--1",
              isCalm ? "kxd-exec-today__primary--calm" : "kxd-exec-today__primary",
            ].join(" ")}
            aria-labelledby="today-primary"
          >
            <p className="kxd-exec-today__eyebrow">Today&apos;s Focus</p>
            <h2 id="today-primary" className="kxd-exec-today__label kxd-exec-today__label--sr">
              Do this first
            </h2>
            <p className="kxd-exec-today__primary-title">{data.primary.title}</p>
            {data.primary.detail ? (
              <p className="kxd-exec-today__primary-detail">{data.primary.detail}</p>
            ) : null}
            {data.primary.reason && data.primary.reason !== data.primary.detail ? (
              <p className="kxd-exec-today__reason">{data.primary.reason}</p>
            ) : null}
            {evidence.length > 0 ? (
              <ul className="kxd-exec-today__evidence">
                {evidence.map((line) => (
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
            ) : isCalm ? (
              <p className="kxd-exec-today__link kxd-exec-today__link--primary">
                <Link href="/admin/operations/focus">Open Focus</Link>
              </p>
            ) : null}
            <WhyThisDisclosure explainability={data.explainability} />
          </section>

          {/* 3 — My Priorities */}
          <section
            className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--2"
            aria-labelledby="today-priorities"
          >
            <div className="kxd-exec-today__section-head">
              <h2 id="today-priorities" className="kxd-exec-today__label">
                My Priorities
              </h2>
              <Link href="/admin/work" className="kxd-exec-today__section-link">
                Work
              </Link>
            </div>
            {priorities.length === 0 ? (
              <p className="kxd-exec-today__empty">{TODAY_EMPTY.priorities}</p>
            ) : (
              <ul className="kxd-exec-today__list">
                {priorities.map((item) => (
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

          {/* 4 — Today’s Schedule */}
          <section
            className="kxd-exec-today__section kxd-exec-today__section--flow kxd-exec-today__enter kxd-exec-today__enter--3"
            aria-labelledby="today-schedule"
          >
            <h2 id="today-schedule" className="kxd-exec-today__label">
              Today&apos;s Schedule
            </h2>
            {scheduleItems.length === 0 ? (
              <p className="kxd-exec-today__empty">
                {brief?.freshness && !brief.freshness.calendarAvailable
                  ? "Schedule unavailable right now. Time is still yours."
                  : TODAY_EMPTY.schedule}
              </p>
            ) : (
              <ol className="kxd-exec-today__flow">
                {scheduleItems.map((item) => {
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
                          target={
                            item.calendarHtmlLink && !item.workHref
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            item.calendarHtmlLink && !item.workHref
                              ? "noreferrer"
                              : undefined
                          }
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
            )}
            {brief?.freshness?.label ? (
              <p className="kxd-exec-today__freshness">{brief.freshness.label}</p>
            ) : null}
          </section>

          {/* 5 — Needs Judgment (exception only) */}
          {exceptions.length > 0 ? (
            <section
              className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--4"
              aria-labelledby="today-judgment"
            >
              <h2 id="today-judgment" className="kxd-exec-today__label">
                Needs Judgment
              </h2>
              <ul className="kxd-exec-today__list">
                {exceptions.map((item) => (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="kxd-exec-today__row kxd-exec-today__row--notable"
                      >
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

          {/* 6 — What Changed */}
          <section
            className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--5"
            aria-labelledby="today-changed"
          >
            <h2 id="today-changed" className="kxd-exec-today__label">
              What Changed
            </h2>
            {signals.length === 0 ? (
              <p className="kxd-exec-today__empty">{data.activityEmptyMessage}</p>
            ) : (
              <ul className="kxd-exec-today__list">
                {signals.map((item) => {
                  const rowClass = [
                    "kxd-exec-today__row",
                    item.emphasis === "notable"
                      ? "kxd-exec-today__row--notable"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href} className={rowClass}>
                          <span className="kxd-exec-today__row-title">
                            {item.title}
                          </span>
                          <span className="kxd-exec-today__row-meta">{item.meta}</span>
                        </Link>
                      ) : (
                        <div className={rowClass}>
                          <span className="kxd-exec-today__row-title">
                            {item.title}
                          </span>
                          <span className="kxd-exec-today__row-meta">{item.meta}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 9 — Quiet exits */}
          <nav
            className="kxd-exec-today__exits kxd-exec-today__enter kxd-exec-today__enter--6"
            aria-label="Continue into the business"
          >
            {TODAY_QUIET_EXITS.map((exit) => (
              <Link key={exit.href} href={exit.href} className="kxd-exec-today__exit">
                {exit.label}
              </Link>
            ))}
          </nav>
        </article>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
