import Link from "next/link";
import { BrandKitGuide } from "@/components/ces/portal/BrandKitGuide";
import { KxdEmptyState, KxdPage } from "@/components/os";
import type { PortalBrandKitPresentation } from "@/lib/portal/brand-kit";
import type { PortalResourceCategory } from "@/lib/portal/types";
import { ClientHqPageHero } from "./ClientHqPageHero";

export function ResourcesScreen({
  categories,
  brandKit = null,
  eyebrow = "Library",
  title = "Resources",
  lead = "Guides, training, support, and brand standards for your engagement.",
}: {
  categories: PortalResourceCategory[];
  /** When present, renders the reusable Brand Kit guide as the primary experience. */
  brandKit?: PortalBrandKitPresentation | null;
  eyebrow?: string;
  title?: string;
  lead?: string;
}) {
  const visibleCategories = brandKit
    ? categories.filter((category) => category.id !== "brand-kit")
    : categories;
  const hasItems =
    Boolean(brandKit) || visibleCategories.some((c) => c.items.length > 0);

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero eyebrow={eyebrow} title={title} lead={lead} />

      {brandKit ? <BrandKitGuide brandKit={brandKit} /> : null}

      <div
        className={
          brandKit
            ? "kxd-resources-stack kxd-resources-stack--with-brand-kit"
            : "kxd-resources-stack"
        }
      >
        {visibleCategories.map((category) => (
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
                      <Link
                        href={item.href}
                        className="kxd-os-card__title"
                        style={{ textDecoration: "none" }}
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="kxd-os-card__title">{item.title}</p>
                    )}
                    {item.description ? (
                      <p className="kxd-os-meta">{item.description}</p>
                    ) : null}
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
