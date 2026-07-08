export interface CesTimelineEvent {
  id: string;
  label: string;
  at: string;
  detail?: string;
  /** Stage 5: derive from activity engine state */
  state?: "complete" | "current" | "upcoming";
}

export interface CesTimelineProps {
  events: CesTimelineEvent[];
}

function formatTimelineDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CesTimeline({ events }: CesTimelineProps) {
  return (
    <ol className="kxd-ces-timeline">
      {events.map((event, index) => {
        const state =
          event.state ??
          (index === events.length - 1 ? "current" : "complete");

        return (
          <li
            key={event.id}
            className={[
              "kxd-ces-timeline__item",
              state === "complete" ? "kxd-ces-timeline__item--complete" : "",
              state === "current" ? "kxd-ces-timeline__item--current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="kxd-ces-timeline__marker" aria-hidden />
            <div className="kxd-ces-timeline__content">
              <p className="kxd-ces-timeline__label">{event.label}</p>
              <time className="kxd-ces-timeline__date" dateTime={event.at}>
                {formatTimelineDate(event.at)}
              </time>
              {event.detail ? (
                <p className="kxd-ces-timeline__detail">{event.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
