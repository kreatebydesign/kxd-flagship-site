import type { RitualNarrativeBlock } from "@/lib/rituals/intelligence";

export function RitualIntelligenceSection({
  block,
  subdued = false,
}: {
  block: RitualNarrativeBlock;
  subdued?: boolean;
}) {
  if (block.paragraphs.length === 0) return null;

  return (
    <section
      className={`kxd-os-ritual-intelligence__section${subdued ? " kxd-os-ritual-intelligence__section--subdued" : ""}`}
    >
      <h2 className="kxd-os-ritual-intelligence__label">{block.title}</h2>
      <div className="kxd-os-ritual-intelligence__prose">
        {block.paragraphs.map((paragraph, index) => (
          <p key={`${block.id}-${index}`}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export function RitualIntelligenceList({
  label,
  items,
  empty,
}: {
  label: string;
  items: Array<{ id: string; title: string; context: string }>;
  empty?: string;
}) {
  return (
    <section className="kxd-os-ritual-intelligence__section">
      <h2 className="kxd-os-ritual-intelligence__label">{label}</h2>
      {items.length === 0 ? (
        <p className="kxd-os-ritual-intelligence__empty">{empty ?? "Nothing notable in this area."}</p>
      ) : (
        <ul className="kxd-os-ritual-intelligence__list">
          {items.map((item) => (
            <li key={item.id} className="kxd-os-ritual-intelligence__list-item">
              <p className="kxd-os-ritual-intelligence__item-title">{item.title}</p>
              <p className="kxd-os-ritual-intelligence__item-context">{item.context}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
