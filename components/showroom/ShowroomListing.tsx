import Link from "next/link";
import type { PublicInventoryVehicle } from "@/lib/inventory/types";
import {
  formatInventoryIdentity,
  formatInventoryPrice,
  inventoryGroupLabel,
  inventoryStatusLabel,
  inventoryStatusTone,
} from "@/lib/inventory/presentation";

type Props = {
  clientSlug: string;
  clientName: string;
  vehicles: PublicInventoryVehicle[];
  group?: string | null;
};

const GROUPS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "used", label: "Pre-owned" },
  { id: "coming_soon", label: "Coming soon" },
] as const;

export function ShowroomListing({
  clientSlug,
  clientName,
  vehicles,
  group,
}: Props) {
  const activeGroup = group && group !== "all" ? group : "all";

  return (
    <div className="kxd-showroom">
      <header className="kxd-showroom__hero">
        <p className="kxd-showroom__eyebrow">Showroom inventory</p>
        <h1 className="kxd-showroom__title">{clientName}</h1>
        <p className="kxd-showroom__lead">
          A curated selection — composed for buyers who value precision.
        </p>
      </header>

      <nav className="kxd-showroom__filters" aria-label="Inventory groups">
        {GROUPS.map((item) => {
          const href =
            item.id === "all"
              ? `/showroom/${clientSlug}`
              : `/showroom/${clientSlug}?group=${item.id}`;
          const isActive = activeGroup === item.id;
          return (
            <Link
              key={item.id}
              href={href}
              className={
                isActive
                  ? "kxd-showroom__filter is-active"
                  : "kxd-showroom__filter"
              }
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {vehicles.length === 0 ? (
        <section className="kxd-showroom__empty">
          <h2>No vehicles in this view</h2>
          <p>Check back soon — new inventory is prepared carefully.</p>
        </section>
      ) : (
        <section className="kxd-showroom__grid" aria-label="Vehicles">
          {vehicles.map((vehicle) => (
            <article key={vehicle.id} className="kxd-showroom-card">
              <Link
                href={`/showroom/${clientSlug}/${vehicle.slug}`}
                className="kxd-showroom-card__media"
              >
                {vehicle.primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vehicle.primaryImage.url}
                    alt={vehicle.primaryImage.alt || vehicle.title}
                  />
                ) : (
                  <div className="kxd-showroom-card__placeholder">Coming soon</div>
                )}
                {vehicle.featured ? (
                  <span className="kxd-showroom-card__badge">Featured</span>
                ) : null}
              </Link>
              <div className="kxd-showroom-card__body">
                <div className="kxd-showroom-card__meta">
                  <span
                    className={`kxd-ces-status kxd-ces-status--${inventoryStatusTone(vehicle.listingStatus)}`}
                  >
                    {inventoryStatusLabel(vehicle.listingStatus)}
                  </span>
                  <span>{inventoryGroupLabel(vehicle.inventoryGroup)}</span>
                </div>
                <h2>
                  <Link href={`/showroom/${clientSlug}/${vehicle.slug}`}>
                    {vehicle.title}
                  </Link>
                </h2>
                <p className="kxd-showroom-card__identity">
                  {formatInventoryIdentity(vehicle)}
                </p>
                <p className="kxd-showroom-card__price">
                  {formatInventoryPrice(vehicle)}
                </p>
                {vehicle.summary ? (
                  <p className="kxd-showroom-card__summary">{vehicle.summary}</p>
                ) : null}
                <Link
                  href={`/showroom/${clientSlug}/${vehicle.slug}`}
                  className="kxd-showroom-card__cta"
                >
                  View vehicle
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
