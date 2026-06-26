export interface OperationsPageHeroProps {
  eyebrow: string;
  title: string;
  lead?: string;
}

export function OperationsPageHero({ eyebrow, title, lead }: OperationsPageHeroProps) {
  return (
    <header className="kxd-os-ops-hero">
      <p className="kxd-os-eyebrow">{eyebrow}</p>
      <h1 className="kxd-os-display kxd-os-ops-hero__title">{title}</h1>
      {lead && <p className="kxd-os-ops-hero__lead">{lead}</p>}
    </header>
  );
}
