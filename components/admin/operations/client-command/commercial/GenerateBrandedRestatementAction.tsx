"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateBrandedRestatementAction(props: { contractId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sales/contracts/${props.contractId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-courtesy-branded-restatement" }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !data.ok) {
        throw new Error(String(data.error ?? "Could not generate branded restatement."));
      }
      setMessage(
        `Branded restatement v${String(data.version ?? "")} filed. Original acceptance, payment, and certificate were not changed.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-commercial-restatement-action">
      <button
        type="button"
        className="kxd-os-btn"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? "Generating…" : "Generate Branded Restatement"}
      </button>
      <p className="kxd-os-commercial-muted">
        Courtesy PDF only. Does not request a new signature or change payment.
      </p>
      {error ? (
        <p role="alert" className="kxd-os-commercial-notes">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="kxd-os-commercial-notes">
          {message}
        </p>
      ) : null}
    </div>
  );
}