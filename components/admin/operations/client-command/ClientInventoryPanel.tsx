"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import type { InventoryVehicleRecord } from "@/lib/inventory/types";
import { LISTING_STATUS_LABELS } from "@/lib/inventory/constants";

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

  return (
    <section className="kxd-os-workspace-chapter">
      <header className="kxd-os-workspace-chapter__header">
        <h2 className="kxd-os-workspace-chapter__title">Inventory</h2>
        <p className="kxd-os-workspace-chapter__lead">
          Shared Core vehicle listings for this client. Portal users manage the
          same records when Inventory is entitled.
        </p>
      </header>

      {loading ? <p className="kxd-os-meta">Loading inventory…</p> : null}
      {error ? <p className="kxd-os-meta">{error}</p> : null}

      {!loading && !error && vehicles.length === 0 ? (
        <p className="kxd-os-meta">
          No inventory vehicles yet. When entitled, the client can add listings
          from Connected Workspace → Inventory.
        </p>
      ) : null}

      {vehicles.length > 0 ? (
        <div className="kxd-os-table-wrap">
          <table className="kxd-os-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Condition</th>
                <th>Price</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <Link
                      href={`/admin/collections/client-inventory-vehicles/${vehicle.id}`}
                    >
                      {vehicle.title}
                    </Link>
                  </td>
                  <td>
                    {LISTING_STATUS_LABELS[vehicle.listingStatus] ??
                      vehicle.listingStatus}
                  </td>
                  <td>{vehicle.condition}</td>
                  <td>
                    {vehicle.price != null
                      ? `$${vehicle.price.toLocaleString()}`
                      : "—"}
                  </td>
                  <td>
                    {vehicle.updatedAt
                      ? new Date(vehicle.updatedAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
