"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Operator action: Start Client Launch from an onboarding-eligible modern commercial package.
 */
export function StartClientLaunchButton(props: {
  contractId: number;
  onboardingEligible: boolean;
  alreadyLaunchedClientId?: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  if (props.alreadyLaunchedClientId) {
    return (
      <div className="kxd-os-commercial-panel-card">
        <h3>Client Launch</h3>
        <p className="kxd-os-commercial-muted">
          This agreement already launched client #{props.alreadyLaunchedClientId}.
        </p>
        <a
          className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
          href={`/admin/operations/client-command/${props.alreadyLaunchedClientId}`}
        >
          Open client workspace
        </a>
      </div>
    );
  }

  if (!props.onboardingEligible) {
    return null;
  }

  async function start() {
    setBusy(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/admin/commercial-launch-handoff/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: props.contractId }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        launchWizardUrl?: string;
        warnings?: string[];
        alreadyLaunched?: boolean;
        launchedClientId?: number | null;
      };
      if (!res.ok || !data.success || !data.launchWizardUrl) {
        setError(data.message || "Could not start Client Launch.");
        return;
      }
      if (data.warnings?.length) setWarnings(data.warnings);
      router.push(data.launchWizardUrl);
    } catch {
      setError("Could not start Client Launch.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-commercial-panel-card">
      <h3>Client Launch</h3>
      <p className="kxd-os-commercial-muted">
        Onboarding eligible. Open the Client Launch Wizard with verified commercial
        details prefilled. You remain the final launch gate — nothing provisions until
        you confirm.
      </p>
      {warnings.length ? (
        <ul className="kxd-os-commercial-notes">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="kxd-os-commercial-notes" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="kxd-os-btn kxd-os-btn--primary"
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? "Preparing…" : "Start Client Launch"}
      </button>
    </div>
  );
}
