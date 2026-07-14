"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { InventoryVehicleRecord } from "@/lib/inventory/types";
import {
  CONDITION_LABELS,
  LISTING_STATUS_LABELS,
  PRICE_MODE_LABELS,
} from "@/lib/inventory/constants";
import { portalCopy } from "@/lib/ces/copy/portal-language";
import { CesHero, CesPage } from "@/components/ces/primitives";

type Props = {
  profile: ResolvedExperienceProfile;
  vehicles: InventoryVehicleRecord[];
};

export function InventoryLanding({ profile, vehicles: initial }: Props) {
  const t = profile.terminology;
  const [vehicles, setVehicles] = useState(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (status !== "all" && vehicle.listingStatus !== status) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        vehicle.title.toLowerCase().includes(q) ||
        vehicle.make.toLowerCase().includes(q) ||
        vehicle.model.toLowerCase().includes(q) ||
        (vehicle.stockNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [vehicles, query, status]);

  function refresh() {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/portal/inventory");
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not refresh inventory.");
        return;
      }
      setVehicles(data.vehicles);
    });
  }

  async function setListingStatus(id: number, listingStatus: string) {
    setError(null);
    const response = await fetch(`/api/portal/inventory/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingStatus }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setError(data.message || "Could not update status.");
      return;
    }
    setVehicles((prev) =>
      prev.map((row) => (row.id === id ? data.vehicle : row)),
    );
  }

  async function duplicate(id: number) {
    setError(null);
    const response = await fetch(`/api/portal/inventory/${id}/duplicate`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setError(data.message || "Could not duplicate.");
      return;
    }
    refresh();
  }

  return (
    <CesPage>
      <CesHero
        eyebrow={portalCopy(t, "inventory.landing.eyebrow", "Listings")}
        title={portalCopy(t, "inventory.landing.title", "Inventory")}
        lead={portalCopy(
          t,
          "inventory.landing.lead",
          "Manage the vehicles that appear on your website.",
        )}
        presence
        actions={
          <div className="kxd-ces-hero__action-row">
            <Link href="/portal/inventory/new" className="kxd-ces-btn kxd-ces-btn--primary">
              Add vehicle
            </Link>
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--ghost"
              onClick={refresh}
              disabled={pending}
            >
              Refresh
            </button>
          </div>
        }
      />

      <section className="kxd-ces-section kxd-inv-toolbar">
        <label className="kxd-inv-field">
          <span>Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Make, model, stock…"
          />
        </label>
        <label className="kxd-inv-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(LISTING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <p className="kxd-inv-error">{error}</p> : null}

      {filtered.length === 0 ? (
        <section className="kxd-ces-section kxd-inv-empty">
          <h2>No vehicles yet</h2>
          <p>
            Add your first listing to begin publishing New, Used, and Coming Soon
            inventory to your website through KXD OS.
          </p>
          <Link href="/portal/inventory/new" className="kxd-ces-btn kxd-ces-btn--primary">
            Add your first vehicle
          </Link>
        </section>
      ) : (
        <section className="kxd-ces-section" aria-label="Inventory list">
          <ul className="kxd-inv-list">
            {filtered.map((vehicle) => (
              <li key={vehicle.id} className="kxd-inv-card">
                <div className="kxd-inv-card__media">
                  {vehicle.primaryImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vehicle.primaryImage.url}
                      alt={vehicle.primaryImage.alt}
                    />
                  ) : (
                    <div className="kxd-inv-card__placeholder">No photo</div>
                  )}
                </div>
                <div className="kxd-inv-card__body">
                  <div className="kxd-inv-card__top">
                    <h3>
                      <Link href={`/portal/inventory/${vehicle.id}`}>
                        {vehicle.title}
                      </Link>
                    </h3>
                    <span data-status={vehicle.listingStatus}>
                      {LISTING_STATUS_LABELS[vehicle.listingStatus] ??
                        vehicle.listingStatus}
                    </span>
                  </div>
                  <p className="kxd-inv-card__meta">
                    {CONDITION_LABELS[vehicle.condition]} ·{" "}
                    {vehicle.year ? `${vehicle.year} ` : ""}
                    {vehicle.make} {vehicle.model}
                    {vehicle.trim ? ` ${vehicle.trim}` : ""}
                  </p>
                  <p className="kxd-inv-card__price">
                    {vehicle.priceDisplayMode === "exact" && vehicle.price != null
                      ? `$${vehicle.price.toLocaleString()}`
                      : PRICE_MODE_LABELS[vehicle.priceDisplayMode]}
                  </p>
                  <div className="kxd-inv-card__actions">
                    <Link
                      href={`/portal/inventory/${vehicle.id}`}
                      className="kxd-ces-btn kxd-ces-btn--ghost"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="kxd-ces-btn kxd-ces-btn--ghost"
                      onClick={() => setListingStatus(vehicle.id, "available")}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      className="kxd-ces-btn kxd-ces-btn--ghost"
                      onClick={() => setListingStatus(vehicle.id, "pending")}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      className="kxd-ces-btn kxd-ces-btn--ghost"
                      onClick={() => setListingStatus(vehicle.id, "sold")}
                    >
                      Sold
                    </button>
                    <button
                      type="button"
                      className="kxd-ces-btn kxd-ces-btn--ghost"
                      onClick={() => setListingStatus(vehicle.id, "hidden")}
                    >
                      Hide
                    </button>
                    <button
                      type="button"
                      className="kxd-ces-btn kxd-ces-btn--ghost"
                      onClick={() => duplicate(vehicle.id)}
                    >
                      Duplicate
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </CesPage>
  );
}
