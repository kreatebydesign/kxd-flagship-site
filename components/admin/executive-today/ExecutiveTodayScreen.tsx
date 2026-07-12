import Link from "next/link";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import type { ExecutiveTodayData } from "@/lib/executive-today";
import { ExecutiveTodayCapture } from "./ExecutiveTodayCapture";

/**
 * Permanent Executive Today home — typography-first, priority-first.
 * Phase 22B visual refinement.
 */
export function ExecutiveTodayScreen({ data }: { data: ExecutiveTodayData }) {
  const primaryClass =
    data.primary.from === "calm"
      ? "kxd-exec-today__primary kxd-exec-today__primary--calm"
      : "kxd-exec-today__primary";

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="today">
        <article className="kxd-exec-today">
          <header className="kxd-exec-today__hero kxd-exec-today__enter">
            <p className="kxd-exec-today__greeting">{data.greeting}</p>
            <h1 className="kxd-exec-today__headline">Today</h1>
            <p className="kxd-exec-today__welcome">{data.welcome}</p>
            <p className="kxd-exec-today__meta">
              {data.dateDisplay}
              <span aria-hidden> · </span>
              {data.timeDisplay}
            </p>
          </header>

          <section
            className={`kxd-exec-today__section kxd-exec-today__section--primary kxd-exec-today__enter kxd-exec-today__enter--1 ${primaryClass}`}
            aria-labelledby="today-primary"
          >
            <h2 id="today-primary" className="kxd-exec-today__label">
              Next
            </h2>
            <p className="kxd-exec-today__primary-title">{data.primary.title}</p>
            <p className="kxd-exec-today__primary-detail">{data.primary.detail}</p>
            <p className="kxd-exec-today__reason">{data.primary.reason}</p>
            {data.primary.href ? (
              <p className="kxd-exec-today__link kxd-exec-today__link--primary">
                <Link href={data.primary.href}>
                  {data.primary.hrefLabel ?? "Continue"}
                </Link>
              </p>
            ) : null}
          </section>

          <section
            className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--2"
            aria-labelledby="today-focus"
          >
            <div className="kxd-exec-today__section-head">
              <h2 id="today-focus" className="kxd-exec-today__label">
                Today&apos;s Focus
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
            className="kxd-exec-today__section kxd-exec-today__enter kxd-exec-today__enter--3"
            aria-labelledby="today-activity"
          >
            <h2 id="today-activity" className="kxd-exec-today__label">
              Activity
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
            className="kxd-exec-today__section kxd-exec-today__section--intel kxd-exec-today__enter kxd-exec-today__enter--4"
            aria-labelledby="today-intel"
          >
            <h2 id="today-intel" className="kxd-exec-today__label">
              Intelligence
            </h2>
            <p className="kxd-exec-today__intel-posture">
              {data.intelligence.postureLabel}
            </p>
            <p className="kxd-exec-today__intel-headline">{data.intelligence.headline}</p>
            {data.intelligence.summary !== data.intelligence.headline ? (
              <p className="kxd-exec-today__intel-summary">{data.intelligence.summary}</p>
            ) : null}
          </section>

          <section
            className="kxd-exec-today__section kxd-exec-today__section--capture kxd-exec-today__enter kxd-exec-today__enter--5"
            aria-labelledby="today-capture"
          >
            <h2 id="today-capture" className="kxd-exec-today__label">
              Quick Capture
            </h2>
            <ExecutiveTodayCapture />
          </section>

          <section
            className="kxd-exec-today__section kxd-exec-today__section--upcoming kxd-exec-today__enter kxd-exec-today__enter--6"
            aria-labelledby="today-upcoming"
          >
            <h2 id="today-upcoming" className="kxd-exec-today__label">
              Upcoming
            </h2>
            <ul className="kxd-exec-today__list">
              {data.upcoming.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className="kxd-exec-today__row">
                      <span className="kxd-exec-today__row-title">{item.label}</span>
                      <span className="kxd-exec-today__row-meta">{item.detail}</span>
                    </Link>
                  ) : (
                    <div className="kxd-exec-today__row kxd-exec-today__row--muted">
                      <span className="kxd-exec-today__row-title">{item.label}</span>
                      <span className="kxd-exec-today__row-meta">{item.detail}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </article>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
