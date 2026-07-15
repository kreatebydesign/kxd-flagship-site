import Link from "next/link";
import type {
  PublicInventoryClient,
  PublicInventoryVehicle,
} from "@/lib/inventory/types";
import {
  formatInventoryIdentity,
  formatInventoryPrice,
  inventoryGroupLabel,
  inventoryStatusLabel,
  inventoryStatusTone,
} from "@/lib/inventory/presentation";
import { ShowroomGallery } from "./ShowroomGallery";

type Props = {
  client: PublicInventoryClient;
  vehicle: PublicInventoryVehicle;
};

export function ShowroomVehicleDetail({ client, vehicle }: Props) {
  const galleryImages = [
    ...(vehicle.primaryImage ? [vehicle.primaryImage] : []),
    ...vehicle.gallery,
  ];

  const inquireHref = vehicle.externalUrl
    ? vehicle.externalUrl
    : client.contactEmail
      ? `mailto:${client.contactEmail}?subject=${encodeURIComponent(`Inquiry: ${vehicle.title}`)}`
      : client.website || `/showroom/${client.slug}`;

  return (
    <div className="kxd-showroom kxd-showroom--detail">
      <nav className="kxd-showroom__crumb">
        <Link href={`/showroom/${client.slug}`}>← {client.name} inventory</Link>
      </nav>

      <div className="kxd-showroom-detail">
        <ShowroomGallery images={galleryImages} title={vehicle.title} />

        <aside className="kxd-showroom-detail__panel">
          <div className="kxd-showroom-detail__meta">
            <span
              className={`kxd-ces-status kxd-ces-status--${inventoryStatusTone(vehicle.listingStatus)}`}
            >
              {inventoryStatusLabel(vehicle.listingStatus)}
            </span>
            <span>{inventoryGroupLabel(vehicle.inventoryGroup)}</span>
          </div>
          <p className="kxd-showroom__eyebrow">{client.name}</p>
          <h1 className="kxd-showroom-detail__title">{vehicle.title}</h1>
          <p className="kxd-showroom-detail__identity">
            {formatInventoryIdentity(vehicle)}
          </p>
          <p className="kxd-showroom-detail__price">
            {formatInventoryPrice(vehicle)}
          </p>
          {vehicle.mileage != null ? (
            <p className="kxd-showroom-detail__mileage">
              {vehicle.mileage.toLocaleString("en-US")} miles
            </p>
          ) : null}
          {vehicle.stockNumber ? (
            <p className="kxd-showroom-detail__stock">
              Stock {vehicle.stockNumber}
            </p>
          ) : null}

          <div className="kxd-showroom-detail__actions">
            <a
              href={inquireHref}
              className="kxd-showroom-btn kxd-showroom-btn--primary"
              target={vehicle.externalUrl || client.website ? "_blank" : undefined}
              rel={
                vehicle.externalUrl || client.website
                  ? "noopener noreferrer"
                  : undefined
              }
            >
              Inquire about this vehicle
            </a>
            {client.website ? (
              <a
                href={client.website}
                className="kxd-showroom-btn kxd-showroom-btn--ghost"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit {client.name}
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      {(vehicle.summary || vehicle.description) && (
        <section className="kxd-showroom-section">
          <h2>Overview</h2>
          {vehicle.summary ? <p className="kxd-showroom-section__lead">{vehicle.summary}</p> : null}
          {vehicle.description ? (
            <div className="kxd-showroom-section__prose">
              {vehicle.description
                .split("\n")
                .filter(Boolean)
                .map((para, index) => (
                  <p key={`${index}-${para.slice(0, 24)}`}>{para}</p>
                ))}
            </div>
          ) : null}
        </section>
      )}

      {vehicle.highlights.length > 0 ? (
        <section className="kxd-showroom-section">
          <h2>Highlights</h2>
          <ul className="kxd-showroom-highlights">
            {vehicle.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {vehicle.specifications.length > 0 ? (
        <section className="kxd-showroom-section">
          <h2>Specifications</h2>
          <dl className="kxd-showroom-specs">
            {vehicle.specifications.map((row) => (
              <div key={`${row.label}-${row.value}`}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
