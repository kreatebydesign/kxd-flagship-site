"use client";

import { useState } from "react";
import Link from "next/link";

export function BrainSearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    Array<{ id: string; type: string; title: string; subtitle?: string; href: string }>
  >([]);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/brain/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <form onSubmit={search} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          className="kxd-os-input"
          placeholder="Executive search — clients, notes, projects, proposals…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: "16rem" }}
        />
        <button type="submit" className="kxd-os-btn kxd-os-btn--ghost" disabled={busy}>
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      {results.length > 0 ? (
        <div className="kxd-os-list-stack" style={{ marginTop: "0.75rem" }}>
          {results.map((r) => (
            <Link key={r.id} href={r.href} className="kxd-os-list-row">
              <p className="kxd-os-body">{r.title}</p>
              <p className="kxd-os-meta">
                {r.type}
                {r.subtitle ? ` · ${r.subtitle}` : ""}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
