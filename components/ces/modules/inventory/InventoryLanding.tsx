"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { InventoryListingStatus, InventoryVehicleRecord } from "@/lib/inventory/types";
import { LISTING_STATUS_LABELS } from "@/lib/inventory/constants";
import {
  formatInventoryIdentity,
  formatInventoryPrice,
  inventoryStatusLabel,
  inventoryStatusTone,
  inventoryStatusTransitions,
} from "@/lib/inventory/presentation";
import { PUBLIC_LISTABLE_STATUSES } from "@/lib/inventory/types";
import { portalCopy } from "@/lib/ces/copy/portal-language";
import { fmtPortalDate } from "@/lib/portal/format";
import { CesHero, CesPage } from "@/components/ces/primitives";

type Props = {
  profile: ResolvedExperienceProfile;
  vehicles: InventoryVehicleRecord[];
};

const PUBLIC_LISTABLE = new Set<string>(PUBLIC_LISTABLE_STATUSES);

export function InventoryLanding({ profile, vehicles: initial }: Props) {
  const t = profile.terminology;
  const [vehicles, setVehicles] = useState(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const isEmptyCollection = vehicles.length === 0;
  const isEmptyFilter = !isEmptyCollection && filtered.length === 0;
  const commandSummary = useMemo(() => {
    const representedOnline = vehicles.filter((vehicle) =>
      PUBLIC_LISTABLE.has(vehicle.listingStatus),
    ).length;
    const complete = vehicles.filter(
      (vehicle) =>
        vehicle.primaryImage &&
        vehicle.summary &&
        (vehicle.price != null ||
          vehicle.priceDisplayMode === "contact" ||
          vehicle.priceDisplayMode === "call"),
    ).length;
    const needsAttention = vehicles.filter(
      (vehicle) => vehicle.listingStatus === "draft" || !vehicle.primaryImage || !vehicle.summary,
    ).length;
    const latest = [...vehicles]
      .filter((vehicle) => vehicle.updatedAt)
      .sort(
        (a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime(),
      )[0];
    return {
      representedOnline,
      completeness: vehicles.length ? Math.round((complete / vehicles.length) * 100) : 0,
      needsAttention,
      latestUpdated: latest?.updatedAt ? fmtPortalDate(latest.updatedAt) : "No changes recorded",
    };
  }, [vehicles]);

  function refresh() {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const response = await fetch("/api/portal/inventory");
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not refresh inventory.");
        return;
      }
      setVehicles(data.vehicles);
      setNotice("Inventory refreshed.");
    });
  }

  async function setListingStatus(id: number, listingStatus: InventoryListingStatus) {
    setError(null);
    setNotice(null);
    setBusyId(id);
    try {
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
      setVehicles((prev) => prev.map((row) => (row.id === id ? data.vehicle : row)));
      setNotice(`Marked ${inventoryStatusLabel(listingStatus).toLowerCase()}.`);
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(id: number) {
    setError(null);
    setNotice(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/portal/inventory/${id}/duplicate`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || "Could not duplicate.");
        return;
      }
      setNotice("Draft copy created.");
      refresh();
    } finally {
      setBusyId(null);
    }
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
            {profile.identity.clientSlug ? (
              <a
                href={`/showroom/${profile.identity.clientSlug}`}
                className="kxd-ces-btn kxd-ces-btn--ghost"
                target="_blank"
                rel="noopener noreferrer"
              >
                View showroom
              </a>
            ) : null}
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--ghost"
              onClick={refresh}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      />

      <section className="kxd-inv-command" aria-labelledby="inventory-command-title">
        <header>
          <p className="kxd-client-home__eyebrow">Inventory command</p>
          <h2 id="inventory-command-title">How your showroom is represented</h2>
          <p>
            A business view of what buyers can see, what needs attention, and how current the
            inventory is.
          </p>
        </header>
        <dl>
          <div>
            <dt>Represented online</dt>
            <dd>{commandSummary.representedOnline}</dd>
          </div>
          <div>
            <dt>Listing completeness</dt>
            <dd>{commandSummary.completeness}%</dd>
          </div>
          <div>
            <dt>Needs attention</dt>
            <dd>{commandSummary.needsAttention}</dd>
          </div>
          <div>
            <dt>Latest change</dt>
            <dd>{commandSummary.latestUpdated}</dd>
          </div>
        </dl>
        <p className="kxd-inv-command__next">
          {commandSummary.needsAttention > 0
            ? "Next opportunity: complete draft listings and add strong primary photography before publishing."
            : vehicles.length > 0
              ? "Your represented inventory is complete. KXD will keep merchandising opportunities visible as listings change."
              : "Verified unit-level inventory will appear here once it has been reviewed and imported."}
        </p>
      </section>

      <section className="kxd-ces-section kxd-inv-toolbar" aria-label="Inventory filters">
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Search</span>
          <input
            className="kxd-inv-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Make, model, stock…"
            autoComplete="off"
          />
        </label>
        <label className="kxd-inv-field">
          <span className="kxd-inv-field__label">Status</span>
          <select
            className="kxd-inv-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            {Object.entries(LISTING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="kxd-inv-toolbar__count" aria-live="polite">
          {filtered.length} listing{filtered.length === 1 ? "" : "s"}
        </p>
      </section>

      {error ? (
        <p className="kxd-inv-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="kxd-inv-notice" role="status">
          {notice}
        </p>
      ) : null}

      {isEmptyCollection ? (
        <section className="kxd-ces-section kxd-ces-empty-guide" aria-labelledby="inv-empty-title">
          <h2 id="inv-empty-title" className="kxd-ces-empty-guide__title">
            Build your first listing
          </h2>
          <ol className="kxd-ces-empty-guide__steps">
            <li>Add the vehicle identity, price, and status.</li>
            <li>Upload a primary photograph and supporting gallery.</li>
            <li>Set status to Available when ready for your website.</li>
          </ol>
          <p className="kxd-ces-empty-guide__closing">
            VIN stays private. Public pages never include it.
          </p>
          <div className="kxd-ces-empty-guide__actions">
            <Link href="/portal/inventory/new" className="kxd-ces-btn kxd-ces-btn--primary">
              Add your first vehicle
            </Link>
          </div>
        </section>
      ) : null}

      {isEmptyFilter ? (
        <section className="kxd-ces-section kxd-ces-empty" aria-labelledby="inv-filter-empty">
          <h2 id="inv-filter-empty" className="kxd-ces-empty__title">
            No matches
          </h2>
          <p className="kxd-ces-empty__lead">
            Nothing matches this search or status filter. Clear filters to see every listing.
          </p>
          <div className="kxd-ces-empty__actions">
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--ghost"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          </div>
        </section>
      ) : null}

      {!isEmptyCollection && !isEmptyFilter ? (
        <section
          className={`kxd-ces-section kxd-inv-list-wrap${pending ? " kxd-inv-list-wrap--pending" : ""}`}
          aria-label="Inventory list"
          aria-busy={pending}
        >
          <ul className="kxd-inv-list">
            {filtered.map((vehicle) => {
              const tone = inventoryStatusTone(vehicle.listingStatus);
              const transitions = inventoryStatusTransitions(vehicle.listingStatus);
              const busy = busyId === vehicle.id;
              return (
                <li key={vehicle.id} className="kxd-inv-card">
                  <Link
                    href={`/portal/inventory/${vehicle.id}`}
                    className="kxd-inv-card__media"
                    tabIndex={-1}
                    aria-hidden
                  >
                    {vehicle.primaryImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vehicle.primaryImage.url} alt="" />
                    ) : (
                      <div className="kxd-inv-card__placeholder">No photo</div>
                    )}
                  </Link>
                  <div className="kxd-inv-card__body">
                    <div className="kxd-inv-card__top">
                      <div>
                        <h3>
                          <Link href={`/portal/inventory/${vehicle.id}`}>{vehicle.title}</Link>
                        </h3>
                        <p className="kxd-inv-card__meta">{formatInventoryIdentity(vehicle)}</p>
                      </div>
                      <span className={`kxd-ces-status kxd-ces-status--${tone}`}>
                        {inventoryStatusLabel(vehicle.listingStatus)}
                      </span>
                    </div>
                    <p className="kxd-inv-card__price">
                      {formatInventoryPrice(vehicle)}
                      {vehicle.featured ? (
                        <span className="kxd-inv-card__featured">Featured</span>
                      ) : null}
                      {PUBLIC_LISTABLE.has(vehicle.listingStatus) ? (
                        <span className="kxd-inv-card__public">Public</span>
                      ) : (
                        <span className="kxd-inv-card__private">Private</span>
                      )}
                    </p>
                    <div className="kxd-inv-card__actions">
                      <Link
                        href={`/portal/inventory/${vehicle.id}`}
                        className="kxd-ces-btn kxd-ces-btn--ghost"
                      >
                        Edit
                      </Link>
                      {transitions.length > 0 ? (
                        <label className="kxd-inv-card__status-control">
                          <span className="sr-only">Change status</span>
                          <select
                            className="kxd-inv-input kxd-inv-input--compact"
                            value=""
                            disabled={busy}
                            aria-label={`Change status for ${vehicle.title}`}
                            onChange={(e) => {
                              const next = e.target.value as InventoryListingStatus;
                              if (!next) return;
                              void setListingStatus(vehicle.id, next);
                              e.currentTarget.value = "";
                            }}
                          >
                            <option value="">Set status…</option>
                            {transitions.map((next) => (
                              <option key={next} value={next}>
                                {inventoryStatusLabel(next)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <button
                        type="button"
                        className="kxd-ces-btn kxd-ces-btn--ghost"
                        disabled={busy}
                        onClick={() => void duplicate(vehicle.id)}
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </CesPage>
  );
}
