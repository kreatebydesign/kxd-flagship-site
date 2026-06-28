"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CommandHubClientRow } from "@/lib/client-command/workspace-types";

export function ClientCommandHubList({
  clients,
  initialQuery,
}: {
  clients: CommandHubClientRow[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((row) =>
      [
        row.name,
        row.slug,
        row.primaryContact,
        row.website,
        row.industry,
        row.status,
        row.relationshipStatus,
      ].some((f) => String(f ?? "").toLowerCase().includes(q)),
    );
  }, [clients, query]);

  return (
    <>
      <div className="kxd-os-command-hub__search">
        <input
          type="search"
          className="kxd-os-command-hub__input"
          placeholder="Search clients by name, contact, website, industry…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search clients"
        />
        <span className="kxd-os-command-hub__count">
          {filtered.length} client{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="kxd-os-workspace-empty">
          <p className="kxd-os-workspace-prose">No clients match your search.</p>
        </div>
      ) : (
        <ul className="kxd-os-command-hub__list">
          {filtered.map((row) => (
            <li key={row.clientId}>
              <Link href={row.href} className="kxd-os-command-hub__row">
                <div className="kxd-os-command-hub__row-main">
                  <span className="kxd-os-command-hub__name">{row.name}</span>
                  {row.primaryContact ? (
                    <span className="kxd-os-command-hub__meta">{row.primaryContact}</span>
                  ) : null}
                </div>
                <div className="kxd-os-command-hub__row-stats">
                  {row.healthScore != null ? (
                    <span className="kxd-os-command-hub__stat">Health {row.healthScore}</span>
                  ) : null}
                  {row.monthlyRevenue != null ? (
                    <span className="kxd-os-command-hub__stat">
                      ${row.monthlyRevenue.toLocaleString()}/mo
                    </span>
                  ) : null}
                  <span className="kxd-os-command-hub__stat">{row.status}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
