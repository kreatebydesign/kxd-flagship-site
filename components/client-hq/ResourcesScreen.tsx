import Link from "next/link";
import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalResourceCategory } from "@/lib/portal/types";

export function ResourcesScreen({ categories }: { categories: PortalResourceCategory[] }) {
  const hasItems = categories.some((c) => c.items.length > 0);

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Library"
        title="Resources"
        lead="Guides, training, support, and brand standards for your engagement."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {categories.map((category) => (
          <section key={category.id} className="kxd-os-card">
            <p className="kxd-os-section__label">{category.title}</p>
            <p className="kxd-os-meta">{category.description}</p>
            {category.items.length === 0 ? (
              <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
                Materials coming soon. KXD Academy integration planned.
              </p>
            ) : (
              <div className="kxd-os-ops-list" style={{ marginTop: "1rem" }}>
                {category.items.map((item) => (
                  <div key={item.title} className="kxd-os-ops-list__row">
                    {item.href ? (
                      <Link href={item.href} className="kxd-os-card__title" style={{ textDecoration: "none" }}>
                        {item.title}
                      </Link>
                    ) : (
                      <p className="kxd-os-card__title">{item.title}</p>
                    )}
                    {item.description ? <p className="kxd-os-meta">{item.description}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {!hasItems ? (
        <div style={{ marginTop: "2rem" }}>
          <KxdEmptyState
            title="Resource library expanding"
            description="Training, guides, and academy content will be added here as your engagement grows."
          />
        </div>
      ) : null}
    </KxdPage>
  );
}
