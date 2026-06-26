export interface ClientHqPageHeroProps {
  eyebrow: string;
  title: string;
  lead?: string;
  presence?: boolean;
}

export function ClientHqPageHero({
  eyebrow,
  title,
  lead,
  presence = false,
}: ClientHqPageHeroProps) {
  return (
    <header className="kxd-os-ops-hero">
      <p className="kxd-os-eyebrow">{eyebrow}</p>
      <h1
        className={`kxd-os-headline kxd-os-ops-hero__title${presence ? " kxd-os-headline--presence" : ""}`}
      >
        {title}
      </h1>
      {lead && <p className="kxd-os-ops-hero__lead">{lead}</p>}
    </header>
  );
}
