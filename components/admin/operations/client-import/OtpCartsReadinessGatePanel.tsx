"use client";

import Link from "next/link";
import {
  buildOtpCartsGateChecklist,
  evaluateOtpCartsImportGate,
  OTP_CARTS_EXPECTED_SLUG,
} from "@/lib/client-launch/otp-carts-readiness";
import { LaunchPanel } from "@/components/admin/operations/client-launch/LaunchFormPrimitives";

type Props = {
  /** Compact variant for the launch pipeline landing. */
  compact?: boolean;
};

/**
 * Operator-facing OTP Carts readiness gate (Phase 4 prerequisite).
 * Read-only guidance — does not create clients, memberships, or invent IDs.
 */
export function OtpCartsReadinessGatePanel({ compact = false }: Props) {
  const gate = evaluateOtpCartsImportGate();
  const checklist = gate.ok
    ? gate.checklist
    : buildOtpCartsGateChecklist(false);

  return (
    <LaunchPanel title="OTP Carts readiness gate">
      <p className="kxd-os-body" style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
        Phase 4 requires OTP Carts as its own Client before any Cusick membership linking.
        Expected slug: <code className="kxd-os-ops-code">{OTP_CARTS_EXPECTED_SLUG}</code>.
        Do not invent a client ID. Import example readiness is{" "}
        <strong>{gate.ok ? "verified" : "blocked"}</strong>
        {gate.ok
          ? " — production launch and membership linking remain pending."
          : "."}
      </p>

      {!compact && (
        <p className="kxd-os-body" style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
          This gate is migration-independent. It does not run or require Phase 3 / Phase 4
          database migrations, and it does not start Phase 4 Batch B.
        </p>
      )}

      <ul className="kxd-os-body" style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.75 }}>
        {checklist.map((item) => (
          <li key={item.id} style={{ marginBottom: "0.65rem" }}>
            <strong>
              {item.status === "ready"
                ? "Ready"
                : item.status === "blocked"
                  ? "Blocked"
                  : "Pending"}
              :
            </strong>{" "}
            {item.label}
            {!compact && (
              <>
                <br />
                <span style={{ opacity: 0.85 }}>{item.detail}</span>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="kxd-os-ops-workflow-actions" style={{ marginTop: "1.25rem" }}>
        <Link
          href="/admin/operations/client-import"
          className="kxd-os-btn kxd-os-btn--secondary"
        >
          Open Client Import
        </Link>
        <Link
          href="/admin/operations/clients/launch"
          className="kxd-os-btn kxd-os-btn--ghost"
        >
          Client Launch pipeline
        </Link>
      </div>
    </LaunchPanel>
  );
}
