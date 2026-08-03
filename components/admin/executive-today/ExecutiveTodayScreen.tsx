import Link from "next/link";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { WhyThisDisclosure } from "@/components/admin/executive-intelligence/WhyThisDisclosure";
import type { ExecutiveTodayData } from "@/lib/executive-today";
import { TODAY_QUIET_EXITS } from "@/lib/executive-today/presentation";
import { formatClock } from "@/lib/executive-today/brief/time-model";

/**
 * Today — sole founder home.
 * Phase 7 Batch D.1 — founder experience recomposition.
 *
 * First viewport answers, in order:
 * 1. How is my business?
 * 2. What deserves me first?
 * 3. Who or what is waiting?
 * 4. What does my day look like?
 */
export function ExecutiveTodayScreen({ data }: { data: ExecutiveTodayData }) {
  const xp = data.experience;
  const brief = data.brief;
  const tz = brief?.bounds.timeZone ?? "America/Los_Angeles";
  const isCalm = xp.primary.from === "calm";
  const primaryHref = xp.primary.href;
  const primaryLabel = xp.primary.hrefLabel ?? (isCalm ? "Enter Focus" : "Begin");

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="today">
        <article className="kxd-exec-today" aria-label="Today">
          {/* 1 — How is my business? */}
          <header className="kxd-exec-today__hero kxd-exec-today__enter">
            <p className="kxd-exec-today__greeting">{data.greeting}</p>
            <h1 className="kxd-exec-today__posture-line">{xp.postureLine}</h1>
            <p className="kxd-exec-today__day-sentence">{xp.daySentence}</p>
            <p className="kxd-exec-today__meta">
              <span className="kxd-exec-today__brand">Today</span>
              <span aria-hidden> · </span>
              <time dateTime={data.generatedAt}>{data.dateDisplay}</time>
            </p>
          </header>

          {/* 2 — What deserves me first? */}
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
            <h2 id="today-primary" className="kxd-exec-today__primary-title">
              {xp.primary.title}
            </h2>
            {xp.primary.detail ? (
              <p className="kxd-exec-today__primary-detail">{xp.primary.detail}</p>
            ) : null}
            {primaryHref ? (
              <p className="kxd-exec-today__cta">
                <Link href={primaryHref} className="kxd-exec-today__cta-link">
                  {primaryLabel}
                </Link>
              </p>
            ) : isCalm ? (
              <p className="kxd-exec-today__cta">
                <Link
                  href="/admin/operations/focus"
                  className="kxd-exec-today__cta-link"
                >
                  Enter Focus
                </Link>
              </p>
            ) : null}
            <WhyThisDisclosure explainability={data.explainability} />
          </section>

          {/* 3 — Who or what is waiting? */}
          <section
            className="kxd-exec-today__section kxd-exec-today__section--waiting kxd-exec-today__enter kxd-exec-today__enter--2"
            aria-labelledby="today-waiting"
          >
            <h2 id="today-waiting" className="kxd-exec-today__label">
              Waiting For You
            </h2>
            {xp.waitingForYou.length === 0 ? (
              <p className="kxd-exec-today__empty">{xp.waitingEmpty}</p>
            ) : (
              <ul className="kxd-exec-today__list">
                {xp.waitingForYou.map((item) => (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="kxd-exec-today__row kxd-exec-today__row--notable"
                      >
                        <span className="kxd-exec-today__row-title">{item.title}</span>
                        <span className="kxd-exec-today__row-meta">{item.meta}</span>
                      </Link>
                    ) : (
                      <div className="kxd-exec-today__row kxd-exec-today__row--notable">
                        <span className="kxd-exec-today__row-title">{item.title}</span>
                        <span className="kxd-exec-today__row-meta">{item.meta}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 4 — What does my day look like? */}
          <section
            className="kxd-exec-today__section kxd-exec-today__section--flow kxd-exec-today__enter kxd-exec-today__enter--3"
            aria-labelledby="today-flow"
          >
            <h2 id="today-flow" className="kxd-exec-today__label">
              Today&apos;s Flow
            </h2>
            {xp.flowPeriods.length === 0 ? (
              <p className="kxd-exec-today__empty">{xp.scheduleEmpty}</p>
            ) : (
              <div className="kxd-exec-today__periods">
                {xp.flowPeriods.map((group) => (
                  <div key={group.period} className="kxd-exec-today__period">
                    <p className="kxd-exec-today__period-label">{group.period}</p>
                    <ol className="kxd-exec-today__flow">
                      {group.items.map((item) => {
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
                            <span className="kxd-exec-today__flow-time">
                              {timeLabel}
                            </span>
                            <span className="kxd-exec-today__flow-main">
                              <span className="kxd-exec-today__flow-title">
                                {item.title}
                              </span>
                            </span>
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
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Supporting — Momentum */}
          <section
            className="kxd-exec-today__section kxd-exec-today__section--momentum kxd-exec-today__enter kxd-exec-today__enter--4"
            aria-labelledby="today-momentum"
          >
            <h2 id="today-momentum" className="kxd-exec-today__label">
              Momentum
            </h2>
            <p className="kxd-exec-today__momentum">{xp.momentumLine}</p>
          </section>

          {/* Supporting — My Priorities (Batch A; quieter than first viewport) */}
          {xp.priorities.length > 0 ? (
            <section
              className="kxd-exec-today__section kxd-exec-today__section--supporting kxd-exec-today__enter kxd-exec-today__enter--5"
              aria-labelledby="today-priorities"
            >
              <div className="kxd-exec-today__section-head">
                <h2 id="today-priorities" className="kxd-exec-today__label">
                  Also on your desk
                </h2>
                <Link href="/admin/work" className="kxd-exec-today__section-link">
                  Work
                </Link>
              </div>
              <ul className="kxd-exec-today__list">
                {xp.priorities.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="kxd-exec-today__row">
                      <span className="kxd-exec-today__row-title">{item.title}</span>
                      <span className="kxd-exec-today__row-meta">{item.meta}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Background — Signals */}
          <section
            className="kxd-exec-today__section kxd-exec-today__section--signals kxd-exec-today__enter kxd-exec-today__enter--6"
            aria-labelledby="today-signals"
          >
            <h2 id="today-signals" className="kxd-exec-today__label">
              Signals
            </h2>
            {xp.signals.length === 0 ? (
              <p className="kxd-exec-today__empty">{xp.signalsEmpty}</p>
            ) : (
              <ul className="kxd-exec-today__list">
                {xp.signals.map((item) => {
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
                        </Link>
                      ) : (
                        <div className={rowClass}>
                          <span className="kxd-exec-today__row-title">
                            {item.title}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <nav
            className="kxd-exec-today__exits kxd-exec-today__enter kxd-exec-today__enter--6"
            aria-label="Continue into the business"
          >
            {TODAY_QUIET_EXITS.map((exit) => (
              <Link
                key={exit.href}
                href={exit.href}
                className="kxd-exec-today__exit"
              >
                {exit.label}
              </Link>
            ))}
          </nav>
        </article>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
