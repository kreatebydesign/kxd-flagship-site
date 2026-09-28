import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalDoc } from "@/lib/portal/types";
import { fmtPortalDate } from "@/lib/portal/format";

type WorkBucket = "waiting" | "in-progress" | "next" | "completed-dated" | "historical";

type WorkRow = {
  id: string | number;
  title: string;
  detail: string | null;
  meta: string | null;
  bucket: WorkBucket;
};

function clientStatusLabel(status: string): string {
  switch (status) {
    case "waiting-on-client":
      return "Waiting on you";
    case "in-progress":
      return "In progress";
    case "blocked":
      return "Paused";
    case "not-started":
      return "Up next";
    case "complete":
      return "Completed";
    default:
      return "In progress";
  }
}

function classifyDeliverable(doc: PortalDoc, now = new Date()): WorkRow | null {
  const title = String(doc.title ?? "").trim();
  if (!title) return null;

  const status = String(doc.status ?? "not-started");
  const notes =
    typeof doc.notes === "string" && doc.notes.trim() ? doc.notes.trim() : null;
  const completedRaw =
    doc.completedDate != null ? String(doc.completedDate).slice(0, 10) : null;
  const month = typeof doc.month === "number" ? doc.month : null;
  const year = typeof doc.year === "number" ? doc.year : null;
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();

  if (status === "waiting-on-client") {
    return {
      id: doc.id as number,
      title,
      detail: notes,
      meta: "Action needed from you",
      bucket: "waiting",
    };
  }

  if (status === "in-progress" || status === "blocked") {
    return {
      id: doc.id as number,
      title,
      detail: notes,
      meta: clientStatusLabel(status),
      bucket: "in-progress",
    };
  }

  if (status === "not-started") {
    return {
      id: doc.id as number,
      title,
      detail: notes,
      meta: "What’s next",
      bucket: "next",
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
        detail: notes,
        meta: isCurrentMonth
          ? `Completed ${fmtPortalDate(completedRaw)}`
          : `Completed ${fmtPortalDate(completedRaw)} · historical`,
        bucket: isCurrentMonth ? "completed-dated" : "historical",
      };
    }

    // Complete without an exact day — historical/period work, never "Completed September".
    const periodLabel =
      month != null && year != null
        ? month === currentMonth && year === currentYear
          ? "Recent completed work"
          : `Completed work · ${month}/${year}`
        : "Historical completed work";
    return {
      id: doc.id as number,
      title,
      detail: notes,
      meta: periodLabel,
      bucket: "historical",
    };
  }

  return {
    id: doc.id as number,
    title,
    detail: notes,
    meta: clientStatusLabel(status),
    bucket: "in-progress",
  };
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
        <ul className="kxd-kxd-work__list">
          {items.map((item) => (
            <li key={String(item.id)} className="kxd-kxd-work__item">
              <div className="kxd-kxd-work__item-main">
                <p className="kxd-os-card__title">{item.title}</p>
                {item.detail ? (
                  <p className="kxd-os-body kxd-kxd-work__item-detail">{item.detail}</p>
                ) : null}
              </div>
              {item.meta ? (
                <p className="kxd-os-meta kxd-kxd-work__item-meta">{item.meta}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
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
  const completedDated = rows.filter((r) => r.bucket === "completed-dated");
  const historical = rows.filter((r) => r.bucket === "historical");

  const business = clientName?.trim() || "this business";

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="KXD Work"
        title="What KXD is working on"
        lead={`Clear, current work for ${business} — what is finished, what is underway, and anything waiting on you.`}
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
            lead="These items need a simple action from your side before KXD can continue."
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
              title="What’s next"
              lead="Planned next steps already recorded for this business."
              items={nextUp}
              empty=""
            />
          ) : null}
          <WorkSection
            id="kxd-work-completed"
            title="Completed this month"
            lead="Work finished in the current month with a confirmed completion date."
            items={completedDated}
            empty="No dated completions recorded for this month yet."
          />
          {historical.length > 0 ? (
            <WorkSection
              id="kxd-work-historical"
              title="Earlier completed work"
              lead="Documented completed work from prior months. Items without an exact day stay historical — they are never shown as this month’s completions."
              items={historical}
              empty=""
            />
          ) : null}
        </div>
      )}
    </KxdPage>
  );
}
