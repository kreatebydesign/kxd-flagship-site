"use client";

import { useCallback, useState } from "react";
import type { PreviewHealthStatus } from "@/lib/infrastructure/preview-domain-types";

type HealthState = {
  status: PreviewHealthStatus;
  message: string;
  verifiedAt: string;
} | null;

function formatVerifiedAt(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function healthDisplay(status: PreviewHealthStatus): {
  glyph: string;
  label: string;
  className: string;
} {
  if (status === "reachable") {
    return {
      glyph: "🟢",
      label: "Reachable",
      className: "kxd-os-preview-health kxd-os-preview-health--reachable",
    };
  }
  if (status === "redirecting") {
    return {
      glyph: "🟡",
      label: "Redirecting",
      className: "kxd-os-preview-health kxd-os-preview-health--redirecting",
    };
  }
  return {
    glyph: "🔴",
    label: "Unreachable",
    className: "kxd-os-preview-health kxd-os-preview-health--unreachable",
  };
}

export function PreviewDomainManager({
  clientId,
  productionUrl,
  previewUrl,
  editHref,
}: {
  clientId: number;
  productionUrl: string | null;
  previewUrl: string | null;
  editHref: string;
}) {
  const configured = Boolean(previewUrl);
  const [copied, setCopied] = useState<"production" | "preview" | null>(null);
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<HealthState>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const copy = useCallback(async (value: string, which: "production" | "preview") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* quiet */
    }
  }, []);

  const verify = useCallback(async () => {
    if (!configured) return;
    setChecking(true);
    setHealthError(null);
    try {
      const res = await fetch(
        `/api/admin/infrastructure/${clientId}/preview-health`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        health?: {
          status?: PreviewHealthStatus;
          message?: string;
          verifiedAt?: string;
        };
      };
      if (!res.ok || !json.ok || !json.health?.status || !json.health.verifiedAt) {
        throw new Error(json.message || "Unable to verify Preview Website.");
      }
      setHealth({
        status: json.health.status,
        message: json.health.message || "",
        verifiedAt: json.health.verifiedAt,
      });
    } catch (err) {
      setHealthError(
        err instanceof Error ? err.message : "Unable to verify Preview Website.",
      );
    } finally {
      setChecking(false);
    }
  }, [clientId, configured]);

  const healthUi = health ? healthDisplay(health.status) : null;

  return (
    <section className="kxd-os-card kxd-os-preview-domain">
      <div className="kxd-os-preview-domain__head">
        <div>
          <p className="kxd-os-section__label">Preview Domain Manager</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            Permanent preview websites for Website Review and Workspace — resolved from
            Shared Core for every client.
          </p>
        </div>
        <a href={editHref} className="kxd-os-link-quiet">
          Edit in Payload →
        </a>
      </div>

      <div className="kxd-os-preview-domain__grid">
        <div className="kxd-os-preview-domain__row">
          <p className="kxd-os-metric__label">Production Website</p>
          {productionUrl ? (
            <div className="kxd-os-preview-domain__value-row">
              <code className="kxd-os-ops-code kxd-os-preview-domain__url">
                {productionUrl}
              </code>
              <div className="kxd-os-preview-domain__actions">
                <button
                  type="button"
                  className="kxd-os-link-quiet"
                  onClick={() => void copy(productionUrl, "production")}
                >
                  {copied === "production" ? "Copied" : "Copy"}
                </button>
                <a
                  href={productionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kxd-os-link-quiet"
                >
                  Open
                </a>
              </div>
            </div>
          ) : (
            <p className="kxd-os-body">—</p>
          )}
        </div>

        <div className="kxd-os-preview-domain__row">
          <p className="kxd-os-metric__label">Preview Website</p>
          {previewUrl ? (
            <div className="kxd-os-preview-domain__value-row">
              <code className="kxd-os-ops-code kxd-os-preview-domain__url">
                {previewUrl}
              </code>
              <div className="kxd-os-preview-domain__actions">
                <button
                  type="button"
                  className="kxd-os-link-quiet"
                  onClick={() => void copy(previewUrl, "preview")}
                >
                  {copied === "preview" ? "Copied" : "Copy"}
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kxd-os-link-quiet"
                >
                  Open Preview
                </a>
              </div>
            </div>
          ) : (
            <p className="kxd-os-body">Not configured</p>
          )}
        </div>

        <div className="kxd-os-preview-domain__row">
          <p className="kxd-os-metric__label">Preview Status</p>
          <p className="kxd-os-preview-domain__status">
            {configured ? (
              <>
                <span className="kxd-os-preview-domain__status-mark" aria-hidden>
                  ✓
                </span>{" "}
                Active
              </>
            ) : (
              "Not configured"
            )}
          </p>
        </div>

        <div className="kxd-os-preview-domain__row">
          <p className="kxd-os-metric__label">Health</p>
          <div className="kxd-os-preview-domain__health-row">
            {configured ? (
              <>
                {healthUi ? (
                  <p className={healthUi.className}>
                    <span aria-hidden>{healthUi.glyph}</span> {healthUi.label}
                  </p>
                ) : (
                  <p className="kxd-os-meta">Not verified yet</p>
                )}
                <button
                  type="button"
                  className="kxd-os-link-quiet"
                  disabled={checking}
                  onClick={() => void verify()}
                >
                  {checking ? "Checking…" : health ? "Re-check" : "Verify"}
                </button>
              </>
            ) : (
              <p className="kxd-os-meta">—</p>
            )}
          </div>
          {health ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
              Last verified {formatVerifiedAt(health.verifiedAt)}
              {health.message ? ` · ${health.message}` : ""}
            </p>
          ) : null}
          {healthError ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.35rem", color: "var(--kxd-os-critical)" }}>
              {healthError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
