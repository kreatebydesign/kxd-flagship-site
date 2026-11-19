import Link from "next/link";
import type { ReactNode } from "react";
import { WhyThisDisclosure } from "@/components/admin/executive-intelligence/WhyThisDisclosure";
import { OperatorNavLink } from "@/components/admin/operations/shared/OperatorNavLink";
import type { ExecutiveTodayData } from "@/lib/executive-today";
import {
  isUrgentCommercial,
  partitionWaitingForAttention,
  selectNotableClientActivity,
  teamContextMeta,
} from "@/lib/executive-today/founder-today-sections";
import { TODAY_QUIET_EXITS } from "@/lib/executive-today/presentation";
import { formatClock } from "@/lib/executive-today/brief/time-model";

function MetricCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="kxd-founder-metric__label">{label}</p>
      <p className="kxd-founder-metric__value">{value}</p>
      {detail ? <p className="kxd-founder-metric__detail">{detail}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="kxd-founder-metric kxd-founder-metric--link">
      {body}
    </Link>
  ) : (
    <div className="kxd-founder-metric">{body}</div>
  );
}

function Panel({
  title,
  action,
  children,
  id,
  className,
}: {
  id: string;
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={["kxd-founder-panel", className].filter(Boolean).join(" ")}
      aria-labelledby={id}
    >
      <div className="kxd-founder-panel__head">
        <h2 id={id} className="kxd-founder-panel__title">
          {title}
        </h2>
        {action ? (
          <Link href={action.href} className="kxd-founder-panel__action">
            {action.label}
          </Link>
        ) : null}
      </div>
      <div className="kxd-founder-panel__body">{children}</div>
    </section>
  );
}

function RowList({
  items,
}: {
  items: Array<{ id: string; title: string; meta: string; href?: string | null; notable?: boolean }>;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="kxd-founder-rows">
      {items.map((item) => (
        <li key={item.id}>
          {item.href ? (
            <Link
              href={item.href}
              className={[
                "kxd-founder-row",
                item.notable ? "kxd-founder-row--notable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{item.title}</span>
              <span className="kxd-founder-row__meta">{item.meta}</span>
            </Link>
          ) : (
            <div
              className={[
                "kxd-founder-row",
                item.notable ? "kxd-founder-row--notable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{item.title}</span>
              <span className="kxd-founder-row__meta">{item.meta}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="kxd-founder-empty">{message}</p>;
}

/**
 * Founder Today — Batch 3C compact hierarchy.
 * Uses loadExecutiveToday + recomposeTodayExperience only (no parallel intelligence).
 */
export function FounderHybridTodayScreen({ data }: { data: ExecutiveTodayData }) {
  const xp = data.experience;
  const brief = data.brief;
  const tz = brief?.bounds.timeZone ?? "America/Los_Angeles";
  const isCalm = xp.primary.from === "calm";

  const { attention: waitingAttention, team: teamWaiting } = partitionWaitingForAttention(
    xp.waitingForYou,
  );

  const urgentCommercial = data.commercial.items.filter((item) => isUrgentCommercial(item.kind));
  const otherCommercial = data.commercial.items.filter((item) => !isUrgentCommercial(item.kind));

  const clientSignals = selectNotableClientActivity(data.activity, 3);

  const attentionRows = [
    ...waitingAttention.map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      href: item.href,
      notable: true,
    })),
    ...xp.priorities.map((item) => ({
      id: `priority-${item.id}`,
      title: item.title,
      meta: item.meta,
      href: item.href,
      notable: false,
    })),
    ...urgentCommercial.map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      href: item.href,
      notable: true,
    })),
    ...clientSignals.map((item) => ({
      id: `client-signal-${item.id}`,
      title: item.title,
      meta: item.meta,
      href: item.href,
      notable: item.emphasis === "notable",
    })),
  ];

  const hasAttention = attentionRows.length > 0;
  const waitingCount = xp.waitingForYou.length;
  const workOpen = data.focus.length + xp.priorities.length;
  const oppTotal = data.opportunities.qualified + data.opportunities.newOrReviewing;

  const scheduleItems = xp.flowPeriods.flatMap((group) =>
    group.items.map((item) => ({ ...item, period: group.period })),
  );

  const intelHeadline = data.intelligence?.headline?.trim();

  const teamRows = teamWaiting.map((item) => ({
    id: `team-${item.id}`,
    title: item.title,
    meta: teamContextMeta(item.meta),
    href: item.href,
    notable: false,
  }));

  const contextRows = [
    ...xp.signals.map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      href: item.href,
    })),
    ...otherCommercial.map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      href: item.href,
    })),
    ...(oppTotal > 0
      ? [
          {
            id: "opportunities-summary",
            title: "Research opportunities",
            meta: `${data.opportunities.qualified} qualified · ${data.opportunities.newOrReviewing} in review`,
            href: data.opportunities.href,
          },
        ]
      : []),
  ];

  return (
    <div className="kxd-founder-today">
      <header className="kxd-founder-today__header">
        <div>
          <p className="kxd-founder-today__greeting">{data.greeting}</p>
          <h1 className="kxd-founder-today__title">{xp.postureLine}</h1>
          <p className="kxd-founder-today__lede">{xp.daySentence}</p>
          {intelHeadline ? (
            <p className="kxd-founder-today__intel-headline">{intelHeadline}</p>
          ) : null}
        </div>
        <div className="kxd-founder-today__primary-card">
          <p className="kxd-founder-today__eyebrow">Primary move</p>
          <p className="kxd-founder-today__primary-title">{xp.primary.title}</p>
          {xp.primary.detail ? (
            <p className="kxd-founder-today__primary-detail">{xp.primary.detail}</p>
          ) : null}
          {xp.primary.href ? (
            <OperatorNavLink
              href={xp.primary.href}
              className="kxd-founder-today__primary-cta"
              data-today-primary-move="true"
            >
              {xp.primary.hrefLabel ?? "Open"}
            </OperatorNavLink>
          ) : isCalm ? (
            <OperatorNavLink
              href="/admin/operations/focus"
              className="kxd-founder-today__primary-cta"
              data-today-primary-move="true"
            >
              Begin the day
            </OperatorNavLink>
          ) : null}
          <WhyThisDisclosure explainability={data.explainability} />
        </div>
      </header>

      <div className="kxd-founder-today__metrics" aria-label="Business overview">
        <MetricCard
          label="Priority work"
          value={workOpen > 0 ? String(workOpen) : "—"}
          detail={workOpen > 0 ? "Open on your desk" : "Nothing surfaced"}
          href={workOpen > 0 ? "/admin/work" : undefined}
        />
        <MetricCard
          label="Waiting on you"
          value={waitingCount > 0 ? String(waitingCount) : "—"}
          detail={waitingCount > 0 ? "Approvals and judgments" : "Nothing waiting"}
          href={waitingCount > 0 ? "/admin/operations/review-inbox" : undefined}
        />
        <MetricCard
          label="Clients"
          value="Review"
          detail="Accounts that may need attention"
          href="/admin/operations/clients?view=attention"
        />
        <MetricCard
          label="Sales"
          value={data.commercial.items.length > 0 ? String(data.commercial.items.length) : "—"}
          detail={
            data.commercial.items.length > 0
              ? "Pipeline items in motion"
              : "No sales flags today"
          }
          href={data.commercial.items.length > 0 ? data.commercial.href : undefined}
        />
      </div>

      <div className="kxd-founder-today__stack">
        <Panel
          id="founder-attention"
          title="Needs your attention"
          action={{ href: "/admin/work", label: "Work board" }}
          className="kxd-founder-panel--span"
        >
          {hasAttention ? (
            <>
              <RowList items={attentionRows} />
              <p className="kxd-founder-today__portfolio-link">
                <Link href="/admin/operations/clients?view=attention" className="kxd-founder-panel__action">
                  Open clients needing attention
                </Link>
              </p>
            </>
          ) : (
            <>
              <EmptyRow message="Nothing urgent is competing for you right now." />
              <p className="kxd-founder-today__portfolio-link">
                <Link href="/admin/operations/clients?view=attention" className="kxd-founder-panel__action">
                  Review client portfolio
                </Link>
              </p>
            </>
          )}
        </Panel>

        <div className="kxd-founder-today__duo">
          <Panel
            id="founder-schedule"
            title="Coming up"
            action={{ href: "/admin/operations/focus", label: "Focus" }}
          >
            {scheduleItems.length === 0 && data.upcoming.length === 0 ? (
              <EmptyRow message={xp.scheduleEmpty} />
            ) : (
              <>
                {scheduleItems.length > 0 ? (
                  <ul className="kxd-founder-schedule">
                    {scheduleItems.slice(0, 6).map((item) => {
                      const timeLabel = item.allDay
                        ? "All day"
                        : item.startIso
                          ? formatClock(item.startIso, tz)
                          : "—";
                      const externalOnly =
                        !item.workHref && item.calendarHtmlLink?.startsWith("http");
                      const internalHref = item.workHref ?? item.calendarHtmlLink;
                      const row = (
                        <>
                          <span className="kxd-founder-schedule__time">{timeLabel}</span>
                          <span className="kxd-founder-schedule__title">{item.title}</span>
                          <span className="kxd-founder-schedule__meta">{item.period}</span>
                        </>
                      );
                      return (
                        <li key={item.id}>
                          {externalOnly && item.calendarHtmlLink ? (
                            <a
                              href={item.calendarHtmlLink}
                              className="kxd-founder-schedule__row"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {row}
                            </a>
                          ) : internalHref ? (
                            <Link href={internalHref} className="kxd-founder-schedule__row">
                              {row}
                            </Link>
                          ) : (
                            <div className="kxd-founder-schedule__row">{row}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {data.upcoming.length > 0 ? (
                  <ul className="kxd-founder-rows kxd-founder-rows--compact">
                    {data.upcoming.map((item) => (
                      <li key={item.id}>
                        {item.href ? (
                          <Link href={item.href} className="kxd-founder-row">
                            <span>{item.label}</span>
                            <span className="kxd-founder-row__meta">{item.detail}</span>
                          </Link>
                        ) : (
                          <div className="kxd-founder-row">
                            <span>{item.label}</span>
                            <span className="kxd-founder-row__meta">{item.detail}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </Panel>

          <Panel
            id="founder-team"
            title="Team"
            action={{ href: "/admin/work", label: "All work" }}
          >
            {teamRows.length === 0 ? (
              <EmptyRow message="No blocked execution surfaced for the team right now." />
            ) : (
              <RowList items={teamRows} />
            )}
          </Panel>
        </div>

        <Panel
          id="founder-signals"
          title="More context"
          action={{ href: "/admin/operations/intelligence", label: "Insights" }}
        >
          {contextRows.length === 0 ? (
            <EmptyRow message={xp.signalsEmpty} />
          ) : (
            <RowList items={contextRows} />
          )}
        </Panel>
      </div>

      <footer className="kxd-founder-today__footer">
        <p className="kxd-founder-today__momentum">{xp.momentumLine}</p>
        <p className="kxd-founder-today__shape">{xp.dayShapeLine}</p>
        <nav className="kxd-founder-today__quiet-exits" aria-label="Quick navigation">
          {TODAY_QUIET_EXITS.map((exit) => (
            <OperatorNavLink key={exit.href} href={exit.href} className="kxd-founder-today__quiet-link">
              {exit.label}
            </OperatorNavLink>
          ))}
        </nav>
      </footer>
    </div>
  );
}