"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { KxdPage } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type { OperatorClientOption } from "@/lib/executive-client-workspace/events-data";
import type { QrRecordSummary } from "@/lib/qr";

interface GenerateResponse {
  ok: boolean;
  error?: string;
  destinationUrl?: string;
  previewDataUrl?: string;
  svg?: string;
  verified?: boolean;
  decodedDestination?: string | null;
  verificationReason?: string;
  productionReady?: boolean;
  label?: string | null;
  clientId?: number | null;
  record?: QrRecordSummary | null;
  saveWarning?: string | null;
}

function downloadHref(destinationUrl: string, format: "png" | "svg", label?: string | null) {
  const params = new URLSearchParams({
    destinationUrl,
    format,
  });
  if (label) params.set("label", label);
  return `/api/admin/qr/download?${params.toString()}`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function QrGeneratorScreen({
  clients,
  initialRecords,
}: {
  clients: OperatorClientOption[];
  initialRecords: QrRecordSummary[];
}) {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [label, setLabel] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [records, setRecords] = useState<QrRecordSummary[]>(initialRecords);
  const [pending, startTransition] = useTransition();

  const encodedUrl = result?.destinationUrl ?? null;
  const verified = Boolean(result?.verified && result.productionReady);

  const clientNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const client of clients) map.set(client.id, client.name);
    return map;
  }, [clients]);

  const refreshLibrary = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/qr?limit=20", { credentials: "include" });
      const data = (await response.json()) as { ok?: boolean; records?: QrRecordSummary[] };
      if (data.ok && Array.isArray(data.records)) {
        setRecords(data.records);
      }
    } catch {
      // Library refresh is best-effort.
    }
  }, []);

  const onGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/qr/generate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationUrl,
            label: label.trim() || null,
            clientId: clientId ? Number(clientId) : null,
            save: true,
          }),
        });
        const data = (await response.json()) as GenerateResponse;
        if (!response.ok || !data.ok) {
          setResult(null);
          setError(data.error ?? "QR generation failed.");
          return;
        }
        setResult(data);
        if (data.record) {
          setRecords((prev) => {
            const without = prev.filter((row) => row.id !== data.record!.id);
            return [data.record!, ...without].slice(0, 20);
          });
        } else {
          void refreshLibrary();
        }
      } catch {
        setResult(null);
        setError("QR generation failed. Check your connection and try again.");
      }
    });
  };

  const loadRecord = (record: QrRecordSummary) => {
    setDestinationUrl(record.destinationUrl);
    setLabel(record.label ?? "");
    setClientId(record.clientId != null ? String(record.clientId) : "");
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/qr/generate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationUrl: record.destinationUrl,
            label: record.label,
            clientId: record.clientId,
            save: false,
          }),
        });
        const data = (await response.json()) as GenerateResponse;
        if (!response.ok || !data.ok) {
          setError(data.error ?? "Could not regenerate QR.");
          return;
        }
        setResult(data);
      } catch {
        setError("Could not regenerate QR.");
      }
    });
  };

  return (
    <OperationsShell activeId="qr-generator">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="Tools"
          title="QR Generator"
          lead="Encode the exact destination URL into a reliable QR for print and digital use. No shortening, rewriting, or tracking redirects."
        />

        <div
          className="kxd-os-form-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          <section className="kxd-os-card" aria-labelledby="qr-destination-heading">
            <h2 id="qr-destination-heading" className="kxd-os-title">
              Destination
            </h2>
            <p className="kxd-os-ops-hero__lead" style={{ marginTop: "0.35rem", marginBottom: "1rem" }}>
              The QR encodes this string exactly — including query parameters and trailing slashes.
            </p>

            <label className="kxd-os-label" htmlFor="qr-destination-url">
              Destination URL
            </label>
            <input
              id="qr-destination-url"
              className="kxd-os-input"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://www.example.com/path/?utm=…"
              value={destinationUrl}
              onChange={(event) => setDestinationUrl(event.target.value)}
              style={{ width: "100%", marginTop: "0.35rem" }}
            />

            <label className="kxd-os-label" htmlFor="qr-label" style={{ marginTop: "1rem", display: "block" }}>
              Optional label
            </label>
            <input
              id="qr-label"
              className="kxd-os-input"
              type="text"
              maxLength={200}
              placeholder="Pints & Politics — Aug 26"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
            <p className="kxd-os-ops-hero__lead" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
              Metadata only. Never changes the QR destination.
            </p>

            <label className="kxd-os-label" htmlFor="qr-client" style={{ marginTop: "1rem", display: "block" }}>
              Client (optional)
            </label>
            <select
              id="qr-client"
              className="kxd-os-input"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              style={{ width: "100%", marginTop: "0.35rem" }}
            >
              <option value="">No client — internal / general</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--primary"
                onClick={onGenerate}
                disabled={pending || !destinationUrl.trim()}
              >
                {pending ? "Generating…" : "Generate QR"}
              </button>
            </div>

            {error ? (
              <p role="alert" style={{ marginTop: "1rem", color: "var(--kxd-os-danger, #b42318)" }}>
                {error}
              </p>
            ) : null}
            {result?.saveWarning ? (
              <p role="status" style={{ marginTop: "1rem", color: "var(--kxd-os-text-secondary, #6e6e73)" }}>
                {result.saveWarning}
              </p>
            ) : null}
          </section>

          <section className="kxd-os-card" aria-labelledby="qr-preview-heading">
            <h2 id="qr-preview-heading" className="kxd-os-title">
              Preview
            </h2>

            <div
              style={{
                marginTop: "1rem",
                display: "grid",
                placeItems: "center",
                minHeight: "18rem",
                background: "#fff",
                border: "1px solid var(--kxd-os-border, #e5e5e5)",
                padding: "1.25rem",
              }}
            >
              {result?.previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.previewDataUrl}
                  alt="Generated QR code preview"
                  width={280}
                  height={280}
                  style={{ imageRendering: "pixelated", maxWidth: "100%", height: "auto" }}
                />
              ) : (
                <p className="kxd-os-ops-hero__lead">Paste a destination URL and generate.</p>
              )}
            </div>

            {encodedUrl ? (
              <div style={{ marginTop: "1rem" }}>
                <p className="kxd-os-eyebrow">Encoded destination</p>
                <p
                  style={{
                    marginTop: "0.35rem",
                    wordBreak: "break-all",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: "0.9rem",
                  }}
                >
                  {encodedUrl}
                </p>

                {verified ? (
                  <p
                    style={{
                      marginTop: "0.75rem",
                      color: "var(--kxd-os-success, #067647)",
                      fontWeight: 600,
                    }}
                  >
                    Verified — QR destination matches exactly
                  </p>
                ) : (
                  <p
                    role="status"
                    style={{
                      marginTop: "0.75rem",
                      color: "var(--kxd-os-danger, #b42318)",
                      fontWeight: 600,
                    }}
                  >
                    Not production-ready — decode verification failed
                    {result?.decodedDestination
                      ? ` (decoded: ${result.decodedDestination})`
                      : result?.verificationReason
                        ? ` (${result.verificationReason})`
                        : ""}
                  </p>
                )}

                {verified ? (
                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <a
                      className="kxd-os-btn kxd-os-btn--primary"
                      href={downloadHref(encodedUrl, "png", label || result?.label)}
                    >
                      Download PNG
                    </a>
                    <a
                      className="kxd-os-btn kxd-os-btn--secondary"
                      href={downloadHref(encodedUrl, "svg", label || result?.label)}
                    >
                      Download SVG
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <section className="kxd-os-card" style={{ marginTop: "1.5rem" }} aria-labelledby="qr-library-heading">
          <h2 id="qr-library-heading" className="kxd-os-title">
            Recent QR codes
          </h2>
          <p className="kxd-os-ops-hero__lead" style={{ marginTop: "0.35rem", marginBottom: "1rem" }}>
            Saved metadata only. Images regenerate from the exact destination on view or download.
          </p>

          {records.length === 0 ? (
            <p className="kxd-os-ops-hero__lead">No saved QR codes yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="kxd-os-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th align="left">Label</th>
                    <th align="left">Client</th>
                    <th align="left">Destination</th>
                    <th align="left">Created</th>
                    <th align="left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.label ?? "—"}</td>
                      <td>
                        {record.clientName ??
                          (record.clientId != null
                            ? clientNameById.get(record.clientId) ?? `Client ${record.clientId}`
                            : "—")}
                      </td>
                      <td
                        style={{
                          maxWidth: "18rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: "0.85rem",
                        }}
                        title={record.destinationUrl}
                      >
                        {record.destinationUrl}
                      </td>
                      <td>{formatDate(record.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="kxd-os-btn kxd-os-btn--secondary"
                            onClick={() => loadRecord(record)}
                            disabled={pending}
                          >
                            View
                          </button>
                          <a
                            className="kxd-os-btn kxd-os-btn--secondary"
                            href={downloadHref(record.destinationUrl, "png", record.label)}
                          >
                            PNG
                          </a>
                          <a
                            className="kxd-os-btn kxd-os-btn--secondary"
                            href={downloadHref(record.destinationUrl, "svg", record.label)}
                          >
                            SVG
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <style jsx>{`
          @media (max-width: 900px) {
            :global(.kxd-os-form-grid) {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </KxdPage>
    </OperationsShell>
  );
}
