"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { upgradeStatusLabel } from "@/lib/client-upgrade-requests/rules";
import type { UpgradeRequestStatus } from "@/lib/client-upgrade-requests/types";

type Row = {
  id: number;
  moduleLabel: string;
  status: UpgradeRequestStatus;
  createdAt: string;
  accessGranted?: boolean;
};

export function ClientUpgradeRequestsPanel({ clientId }: { clientId: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/upgrade-requests?status=all&clientId=${clientId}`,
        { credentials: "same-origin" },
      );
      const json = (await res.json()) as { ok?: boolean; requests?: Row[] };
      if (res.ok && json.ok) setRows(json.requests ?? []);
    } catch {
      /* panel is secondary */
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async bootstrap
    void load();
  }, [load]);

  const open = rows.filter(
    (row) => row.status === "submitted" || row.status === "reviewing",
  );

  return (
    <section className="kxd-os-card kxd-plans-access" style={{ marginTop: "1rem" }}>
      <div className="kxd-plans-access__head">
        <div>
          <p className="kxd-os-section__label">Upgrade Requests</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            Portal capability requests for this client. Approval does not grant
            access — use Plans &amp; Access above.
          </p>
        </div>
        <Link
          href="/admin/operations/upgrade-requests"
          className="kxd-os-link-quiet"
        >
          Open inbox
        </Link>
      </div>

      {loading ? (
        <p className="kxd-os-meta">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="kxd-os-meta">No upgrade requests yet.</p>
      ) : (
        <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
          {rows.slice(0, 8).map((row) => (
            <li key={row.id}>
              <strong>{row.moduleLabel}</strong>
              <span>
                {upgradeStatusLabel(row.status)}
                {row.accessGranted ? " · Access granted" : ""}
                {open.some((o) => o.id === row.id) ? " · Open" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
