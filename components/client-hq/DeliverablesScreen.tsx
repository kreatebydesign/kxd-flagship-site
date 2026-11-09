import Link from "next/link";
import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalDoc } from "@/lib/portal/types";
import { fmtPortalDate } from "@/lib/portal/format";
import { clientFacingWorkLabel } from "@/lib/portal/deliverables/client-facing-labels";

type WorkBucket = "waiting" | "in-progress" | "next" | "completed-dated" | "historical";

type WorkRow = {
  id: string | number;
  title: string;
  detail: string | null;
  meta: string | null;
  bucket: WorkBucket;
  scheduleYear: number | null;
  scheduleMonth: number | null;
};

const HISTORY_MONTHS: Array<{ year: number; month: number }> = [
  { year: 2026, month: 9 },
  { year: 2026, month: 10 },
  { year: 2026, month: 11 },
];

function formatMonthHeading(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function clientStatusLabel(status: string): string {
  switch (status) {
    case "waiting-on-client":
      return "Waiting on you";
    case "in-progress":
      return "In progress";
    case "blocked":
      return "Paused";
    case "not-started":
      return "Planned";
    case "complete":
      return "Completed";
    default:
      return "In progress";
  }
}

function classifyDeliverable(doc: PortalDoc, now = new Date()): WorkRow | null {
  const internalTitle = String(doc.title ?? "").trim();
  if (!internalTitle) return null;

  const status = String(doc.status ?? "not-started");
  const clientNotes =
    typeof doc.clientNotes === "string" && doc.clientNotes.trim()
      ? doc.clientNotes.trim()
      : null;
  const { title, detail } = clientFacingWorkLabel(internalTitle, clientNotes);
  const completedRaw =
    doc.completedDate != null ? String(doc.completedDate).slice(0, 10) : null;
  const month = typeof doc.month === "number" ? doc.month : null;
  const year = typeof doc.year === "number" ? doc.year : null;
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();

  const scheduleYear = year;
  const scheduleMonth = month;

  if (status === "waiting-on-client") {
    return {
      id: doc.id as number,
      title,
      detail,
      meta: "Action needed from you",
      bucket: "waiting",
      scheduleYear,
      scheduleMonth,
    };
  }

  if (status === "in-progress" || status === "blocked") {
    return {
      id: doc.id as number,
      title,
      detail,
      meta: clientStatusLabel(status),
      bucket: "in-progress",
      scheduleYear,
      scheduleMonth,
    };
  }

  if (status === "not-started") {
    return {
      id: doc.id as number,
      title,
      detail,
      meta: "Planned",
      bucket: "next",
      scheduleYear,
      scheduleMonth,
    };
  }

  if (status === "complete") {
    if (completedRaw) {
      const completedMonth = Number(completedRaw.slice(5, 7));
      const completedYear = Number(completedRaw.slice(0, 4));
      const isCurrentMonth =
        completedMonth === currentMonth && completedYear === currentYear;
      return {
        id: doc.id as number,
        title,
        detail,
        meta: isCurrentMonth
          ? `Completed ${fmtPortalDate(completedRaw)}`
          : `Completed ${fmtPortalDate(completedRaw)}`,
        bucket: isCurrentMonth ? "completed-dated" : "historical",
        scheduleYear,
        scheduleMonth,
      };
    }

    const periodLabel =
      month != null && year != null
        ? `Recorded for ${formatMonthHeading(year, month)}`
        : "Earlier completed work";
    return {
      id: doc.id as number,
      title,
      detail,
      meta: periodLabel,
      bucket: "historical",
      scheduleYear,
      scheduleMonth,
    };
  }

  return {
    id: doc.id as number,
    title,
    detail,
    meta: clientStatusLabel(status),
    bucket: "in-progress",
    scheduleYear,
    scheduleMonth,
  };
}

function WorkList({ items }: { items: WorkRow[] }) {
  return (
    <ul className="kxd-kxd-work__list">
      {items.map((item) => (
        <li key={String(item.id)} className="kxd-kxd-work__item">
          <div className="kxd-kxd-work__item-main">
            <p className="kxd-os-card__title">{item.title}</p>
            {item.detail ? (
              <p className="kxd-os-body kxd-kxd-work__item-detail">{item.detail}</p>
            ) : null}
          </div>
          {item.meta ? <p className="kxd-os-meta kxd-kxd-work__item-meta">{item.meta}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function WorkSection({
  id,
  title,
  lead,
  items,
  empty,
  emphasize,
}: {
  id: string;
  title: string;
  lead?: string;
  items: WorkRow[];
  empty: string;
  emphasize?: boolean;
}) {
  return (
    <section
      className={`kxd-kxd-work__section${emphasize ? " kxd-kxd-work__section--emphasize" : ""}`}
      aria-labelledby={id}
    >
      <h2 id={id} className="kxd-os-section__label">
        {title}
      </h2>
      {lead ? <p className="kxd-os-meta kxd-kxd-work__section-lead">{lead}</p> : null}
      {items.length === 0 ? (
        <p className="kxd-os-meta">{empty}</p>
      ) : (
        <WorkList items={items} />
      )}
    </section>
  );
}

function monthMatches(
  row: WorkRow,
  year: number,
  month: number,
): boolean {
  return row.scheduleYear === year && row.scheduleMonth === month;
}

function isFocusHistoryMonth(year: number, month: number): boolean {
  return HISTORY_MONTHS.some((m) => m.year === year && m.month === month);
}

function rowsForMonth(rows: WorkRow[], year: number, month: number): WorkRow[] {
  return rows.filter((row) => monthMatches(row, year, month));
}

function statusGroupLabel(bucket: WorkBucket): string {
  switch (bucket) {
    case "waiting":
      return "Waiting on you";
    case "in-progress":
      return "In progress";
    case "next":
      return "Planned";
    case "completed-dated":
    case "historical":
      return "Completed";
    default:
      return "Work";
  }
}

function MonthHistoryBlock({
  year,
  month,
  rows,
}: {
  year: number;
  month: number;
  rows: WorkRow[];
}) {
  const monthRows = rowsForMonth(rows, year, month);
  const headingId = `kxd-work-month-${year}-${month}`;
  const groups: WorkBucket[] = ["waiting", "in-progress", "next", "completed-dated", "historical"];

  return (
    <section className="kxd-kxd-work__month" aria-labelledby={headingId}>
      <h2 id={headingId} className="kxd-kxd-work__month-title">
        {formatMonthHeading(year, month)}
      </h2>
      {monthRows.length > 0 ? (
        <div className="kxd-kxd-work__month-groups">
          {groups.map((bucket) => {
            const items = monthRows.filter((row) => row.bucket === bucket);
            if (items.length === 0) return null;
            return (
              <div key={bucket} className="kxd-kxd-work__month-group">
                <h3 className="kxd-os-metric__label">{statusGroupLabel(bucket)}</h3>
                <WorkList items={items} />
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function DeliverablesScreen({
  deliverables,
  clientName,
}: {
  deliverables: PortalDoc[];
  clientName?: string;
}) {
  const rows = deliverables
    .map((doc) => classifyDeliverable(doc))
    .filter((row): row is WorkRow => row != null);

  const waiting = rows.filter((r) => r.bucket === "waiting");
  const inProgress = rows.filter((r) => r.bucket === "in-progress");
  const nextUp = rows.filter((r) => r.bucket === "next");
  const earlierComplete = rows.filter(
    (r) =>
      (r.bucket === "historical" || r.bucket === "completed-dated") &&
      (r.scheduleYear == null ||
        r.scheduleMonth == null ||
        !isFocusHistoryMonth(r.scheduleYear, r.scheduleMonth)),
  );

  const business = clientName?.trim() || "this business";
  const monthsWithWork = HISTORY_MONTHS.filter(({ year, month }) =>
    rowsForMonth(rows, year, month).length > 0,
  );

  return (
    <KxdPage className="kxd-os-page--ops kxd-kxd-work-page">
      <ClientHqPageHero
        eyebrow="KXD Work"
        title="Work history"
        lead={`What KXD has finished, what is active now, and earlier work for ${business}, in plain language.`}
      />

      {rows.length === 0 ? (
        <KxdEmptyState
          title="No work recorded yet"
          description="As KXD completes and tracks work for this business, it will appear here in plain language."
        />
      ) : (
        <div className="kxd-kxd-work">
          <WorkSection
            id="kxd-work-waiting"
            title="Waiting on you"
            lead="A simple action from your side lets KXD continue."
            items={waiting}
            empty="Nothing is waiting on you right now."
            emphasize={waiting.length > 0}
          />
          <WorkSection
            id="kxd-work-progress"
            title="In progress"
            lead="Work KXD is actively carrying for this business."
            items={inProgress}
            empty="No active work items at the moment."
          />
          {nextUp.length > 0 ? (
            <WorkSection
              id="kxd-work-next"
              title="Planned"
              lead="Next steps already recorded for this business."
              items={nextUp}
              empty=""
            />
          ) : null}

          <section className="kxd-kxd-work__priorities" aria-labelledby="kxd-work-oct-nov">
            <h2 id="kxd-work-oct-nov" className="kxd-os-section__label">
              Recent months
            </h2>
            <p className="kxd-os-meta kxd-kxd-work__section-lead">
              Ongoing monitoring and search work stays in In progress above. For website
              visitors and Google data, open{" "}
              <Link href="/portal/analytics" className="kxd-os-link-quiet">
                Performance
              </Link>
              . Completed items appear below when they are verified for that month.
            </p>
          </section>

          {monthsWithWork.length > 0 ? (
            <div className="kxd-kxd-work__history">
              <h2 className="kxd-os-section__label">Verified work by month</h2>
              {monthsWithWork.map(({ year, month }) => (
                <MonthHistoryBlock key={`${year}-${month}`} year={year} month={month} rows={rows} />
              ))}
            </div>
          ) : null}

          {earlierComplete.length > 0 ? (
            <WorkSection
              id="kxd-work-earlier"
              title="Earlier completed work"
              lead="Completed items from months before September 2026, or without a reporting month on file."
              items={earlierComplete}
              empty=""
            />
          ) : null}
        </div>
      )}
    </KxdPage>
  );
}
