import type { MorningClientActivity } from "@/lib/rituals/morning-activity";

export function MorningClientActivitySection({
  activity,
}: {
  activity: MorningClientActivity;
}) {
  return (
    <section className="kxd-os-ritual-activity" aria-label={activity.title}>
      <h2 className="kxd-os-ritual-activity__heading">{activity.title}</h2>

      {!activity.hasActivity ? (
        <p className="kxd-os-ritual-activity__empty">{activity.emptyMessage}</p>
      ) : (
        <div className="kxd-os-ritual-activity__groups">
          {activity.groups.map((group) => (
            <article
              key={`${group.clientId ?? "x"}-${group.clientName}`}
              className="kxd-os-ritual-activity__group"
            >
              <h3 className="kxd-os-ritual-activity__client">{group.clientName}</h3>
              <ul className="kxd-os-ritual-activity__list">
                {group.lines.map((line) => {
                  const primary = line.location?.trim() || line.title;
                  const showTitleAside =
                    Boolean(line.location?.trim()) &&
                    line.title.trim().length > 0 &&
                    line.title.trim() !== line.location?.trim();
                  const whenLabel =
                    line.kind === "website-review-new" || line.kind === "website-review-active"
                      ? "Submitted"
                      : line.kind === "communication"
                        ? "Received"
                        : "Updated";

                  return (
                    <li key={line.id} className="kxd-os-ritual-activity__item">
                      <a href={line.href} className="kxd-os-ritual-activity__link">
                        <span className="kxd-os-ritual-activity__kind">
                          <span className="kxd-os-ritual-activity__bullet" aria-hidden="true">
                            ●
                          </span>
                          {line.label}
                        </span>
                        <span className="kxd-os-ritual-activity__primary">{primary}</span>
                        {showTitleAside ? (
                          <span className="kxd-os-ritual-activity__aside">{line.title}</span>
                        ) : null}
                        <span className="kxd-os-ritual-activity__facts">
                          <span>Status: {line.status}</span>
                          <span>
                            {whenLabel}: {line.occurredAtDisplay}
                          </span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
