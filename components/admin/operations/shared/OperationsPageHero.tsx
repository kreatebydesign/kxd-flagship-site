export interface OperationsPageHeroProps {
  eyebrow: string;
  title: string;
  lead?: string;
  /** Rare serif presence — client names, milestone headlines */
  presence?: boolean;
}

export function OperationsPageHero({
  eyebrow,
  title,
  lead,
  presence = false,
}: OperationsPageHeroProps) {
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
