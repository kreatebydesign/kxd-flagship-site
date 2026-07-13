/**
 * Phase 28B — Restrained explainability disclosure.
 * Progressive disclosure. No raw IDs, scores, or provider payloads.
 */

"use client";

import { useState } from "react";
import type { UserFacingExplainability } from "@/lib/executive-intelligence";

export function WhyThisDisclosure({
  explainability,
  className = "",
}: {
  explainability: UserFacingExplainability | null | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!explainability) return null;

  return (
    <div className={`kxd-os-why-this ${className}`.trim()}>
      <button
        type="button"
        className="kxd-os-why-this__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide why" : "Why this?"}
      </button>
      {open ? (
        <div className="kxd-os-why-this__panel" role="region" aria-label={explainability.headline}>
          <p className="kxd-os-why-this__decision">{explainability.decision}</p>
          {explainability.keyEvidence.length > 0 ? (
            <ul className="kxd-os-why-this__evidence">
              {explainability.keyEvidence.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {explainability.businessImpact ? (
            <p className="kxd-os-why-this__impact">
              <span className="kxd-os-why-this__label">Impact</span>
              {explainability.businessImpact}
            </p>
          ) : null}
          {explainability.tradeoff ? (
            <p className="kxd-os-why-this__tradeoff">
              <span className="kxd-os-why-this__label">Tradeoff</span>
              {explainability.tradeoff}
            </p>
          ) : null}
          <p className="kxd-os-why-this__confidence">
            <span className="kxd-os-why-this__label">Confidence</span>
            {explainability.confidence}
            {explainability.confidenceReasons.length > 0
              ? ` — ${explainability.confidenceReasons.slice(0, 2).join("; ")}`
              : null}
          </p>
          <p className="kxd-os-why-this__freshness">{explainability.freshness}</p>
          {explainability.missingInformation.length > 0 ? (
            <p className="kxd-os-why-this__missing">
              Missing: {explainability.missingInformation.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
