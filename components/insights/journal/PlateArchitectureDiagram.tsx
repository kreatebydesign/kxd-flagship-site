import styles from "./journal-feature.module.css";

type PlateArchitectureDiagramProps = {
  caption?: string;
};

const CARDS = [
  {
    title: "Public experience",
    items: [
      "Homepage / experiences / packages",
      "Partner Concierge + Welcome Home",
      "Inquiry form",
      "Token pages: menu review, invoice, feedback",
    ],
  },
  {
    title: "Plate OS",
    items: [
      "Today board",
      "Clients / inquiries / events",
      "Menus / recipes",
      "Invoices + partner sales materials",
    ],
  },
  {
    title: "Persistence",
    items: ["Payload CMS", "MongoDB", "Media + operational records"],
  },
  {
    title: "Resend",
    items: ["Inquiry notifications", "Menu review email", "Feedback follow-up"],
  },
  {
    title: "Square",
    items: [
      "Hosted payment invoices",
      "OAuth connection (sealed tokens)",
      "Webhooks → payment evidence",
    ],
  },
  {
    title: "Discovery",
    items: ["Metadata / canonicals / sitemap", "JSON-LD offers + FAQ", "GA4 + partner funnel events"],
  },
] as const;

export function PlateArchitectureDiagram({ caption }: PlateArchitectureDiagramProps) {
  return (
    <figure className={styles.diagram} aria-label="Plate the Umpqua system architecture">
      <p className={styles.diagramTitle}>System map</p>
      <div className={styles.diagramGrid}>
        {CARDS.map((card) => (
          <div key={card.title} className={styles.diagramCard}>
            <h4>{card.title}</h4>
            <ul>
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className={styles.diagramFlow}>
        Public experience → inquiry / token surfaces → Plate OS → Payload / MongoDB → Resend +
        Square · SEO / GA4 for discovery and measurement
      </p>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
