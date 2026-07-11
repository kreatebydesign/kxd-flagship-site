import type { MorningExecutiveSnapshot } from "@/lib/rituals/morning-snapshot";

export function MorningExecutiveSnapshotSection({
  snapshot,
}: {
  snapshot: MorningExecutiveSnapshot;
}) {
  return (
    <section className="kxd-os-ritual-snapshot" aria-label={snapshot.title}>
      <h2 className="kxd-os-ritual-snapshot__heading">{snapshot.title}</h2>
      <ul className="kxd-os-ritual-snapshot__list">
        {snapshot.metrics.map((metric) => (
          <li key={metric.id} className="kxd-os-ritual-snapshot__item">
            <span className="kxd-os-ritual-snapshot__mark" aria-hidden="true">
              •
            </span>
            <span className="kxd-os-ritual-snapshot__label">{metric.label}:</span>
            <span className="kxd-os-ritual-snapshot__value">{metric.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
