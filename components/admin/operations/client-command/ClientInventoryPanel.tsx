"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import type { InventoryVehicleRecord } from "@/lib/inventory/types";
import { PUBLIC_LISTABLE_STATUSES } from "@/lib/inventory/types";
import {
  formatInventoryIdentity,
  formatInventoryPrice,
  inventoryStatusLabel,
  inventoryStatusTone,
} from "@/lib/inventory/presentation";

const PUBLIC_LISTABLE = new Set<string>(PUBLIC_LISTABLE_STATUSES);

export function ClientInventoryPanel({ data }: { data: ClientWorkspaceBundle }) {
  const clientId = data.clientId;
  const [vehicles, setVehicles] = useState<InventoryVehicleRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/inventory/${clientId}`);
        const json = await response.json();
        if (!response.ok || !json.ok) {
          if (!cancelled) setError(json.error || "Unable to load inventory.");
          return;
        }
        if (!cancelled) setVehicles(json.vehicles ?? []);
      } catch {
        if (!cancelled) setError("Unable to load inventory.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const availableCount = vehicles.filter((v) => v.listingStatus === "available").length;
  const draftCount = vehicles.filter((v) => v.listingStatus === "draft").length;
  const publicCount = vehicles.filter((v) =>
    PUBLIC_LISTABLE.has(v.listingStatus),
  ).length;
  const clientSlug =
    typeof (data.client as { slug?: unknown } | null)?.slug === "string"
      ? String((data.client as { slug: string }).slug)
      : null;

  return (
    <section className="kxd-os-workspace-chapter">
      <header className="kxd-os-workspace-chapter__header">
        <h2 className="kxd-os-workspace-chapter__title">Inventory</h2>
        <p className="kxd-os-workspace-chapter__lead">
          Shared Core vehicle listings for this client. Portal users manage the
          same records when Inventory is entitled.
        </p>
      </header>

      {!loading && !error ? (
        <div className="kxd-os-inv-kpis" aria-label="Inventory summary">
          <p>
            <span>{vehicles.length}</span> total
          </p>
          <p>
            <span>{availableCount}</span> available
          </p>
          <p>
            <span>{publicCount}</span> public
          </p>
          <p>
            <span>{draftCount}</span> draft
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="kxd-os-inv-skeleton" aria-busy="true" aria-live="polite">
          <span className="kxd-os-meta">Loading inventory…</span>
          <div className="kxd-os-inv-skeleton__bars" aria-hidden>
            <div />
            <div />
            <div />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="kxd-os-meta kxd-os-meta--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && vehicles.length === 0 ? (
        <div className="kxd-os-inv-empty">
          <p className="kxd-os-meta">No inventory vehicles yet.</p>
          <p className="kxd-os-meta">
            When entitled, the client can add listings from Connected Workspace →
            Inventory.
          </p>
        </div>
      ) : null}

      {vehicles.length > 0 ? (
        <ul className="kxd-os-inv-rows">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id} className="kxd-os-inv-row">
              <div className="kxd-os-inv-row__media">
                {vehicle.primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vehicle.primaryImage.url} alt="" />
                ) : (
                  <div className="kxd-os-inv-row__placeholder">No photo</div>
                )}
              </div>
              <div className="kxd-os-inv-row__body">
                <div className="kxd-os-inv-row__top">
                  <div>
                    <Link
                      className="kxd-os-inv-row__title"
                      href={`/admin/collections/client-inventory-vehicles/${vehicle.id}`}
                    >
                      {vehicle.title}
                    </Link>
                    <p className="kxd-os-meta">{formatInventoryIdentity(vehicle)}</p>
                  </div>
                  <span
                    className={`kxd-ces-status kxd-ces-status--${inventoryStatusTone(vehicle.listingStatus)}`}
                  >
                    {inventoryStatusLabel(vehicle.listingStatus)}
                  </span>
                </div>
                <div className="kxd-os-inv-row__meta">
                  <span>{formatInventoryPrice(vehicle)}</span>
                  {vehicle.featured ? <span className="kxd-os-inv-featured">Featured</span> : null}
                  <span>
                    {PUBLIC_LISTABLE.has(vehicle.listingStatus) ? "Public" : "Private"}
                  </span>
                  <span>
                    {vehicle.updatedAt
                      ? `Updated ${new Date(vehicle.updatedAt).toLocaleDateString()}`
                      : "—"}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {vehicles.length > 0 && clientSlug ? (
        <p className="kxd-os-inv-showroom">
          <a href={`/showroom/${clientSlug}`} target="_blank" rel="noopener noreferrer">
            Open public showroom →
          </a>
        </p>
      ) : null}
    </section>
  );
}
