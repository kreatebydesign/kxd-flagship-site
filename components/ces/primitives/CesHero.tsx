import type { ReactNode } from "react";

export interface CesHeroProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  presence?: boolean;
}

export function CesHero({ eyebrow, title, lead, actions, presence = false }: CesHeroProps) {
  return (
    <header className="kxd-ces-hero">
      {eyebrow ? <p className="kxd-ces-hero__eyebrow">{eyebrow}</p> : null}
      <h1
        className={[
          "kxd-ces-hero__title",
          presence ? "kxd-ces-hero__title--presence" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {title}
      </h1>
      {lead ? <p className="kxd-ces-hero__lead">{lead}</p> : null}
      {actions ? <div className="kxd-ces-hero__actions">{actions}</div> : null}
    </header>
  );
}
