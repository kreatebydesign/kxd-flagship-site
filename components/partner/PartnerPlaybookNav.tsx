"use client";

import { useEffect, useState } from "react";

export function PartnerPlaybookNav({
  sections,
}: {
  sections: Array<{ id: string; title: string }>;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="kxd-partner-playbook-nav" aria-label="Playbook chapters">
      {sections.map((section, index) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={active === section.id ? "true" : undefined}
        >
          {String(index + 1).padStart(2, "0")} · {section.title}
        </a>
      ))}
    </nav>
  );
}
