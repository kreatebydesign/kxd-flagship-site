"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsCard } from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage } from "@/components/os";

export interface StaffWelcomeScreenProps {
  displayName: string;
  roleTitle: string;
}

const WELCOME_STEPS = [
  {
    title: "One clear next step",
    body: "Your staff home shows a single Start here action. KXD sequences assigned work, training, and approvals so you never guess what matters first.",
  },
  {
    title: "Prepare — do not finalize alone",
    body: "You may draft, organize, verify, and prepare packets. Money, access, public content, pricing, and client promises return to Matt for approval.",
  },
  {
    title: "Facts before invention",
    body: "Use what KXD already knows. If information is missing, note it and ask Matt — never invent client facts, dates, or prices.",
  },
  {
    title: "Begin foundation training",
    body: "After this welcome, continue the Executive Operations Coordinator — Foundation path. Fifteen short modules teach what you may do, what always returns to Matt, and how KXD Intelligence guides real work.",
  },
] as const;

export function StaffWelcomeScreen({ displayName, roleTitle }: StaffWelcomeScreenProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not complete onboarding.");
      }
      router.push("/admin/operations/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete onboarding.");
    } finally {
      setBusy(false);
    }
  }

  const firstName = displayName.trim().split(/\s+/)[0] || displayName;

  return (
    <OperationsShell activeId="staff" variant="staff">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="Welcome"
          title={`Welcome, ${firstName}.`}
          lead={`You are joining KXD OS as ${roleTitle}. This short orientation explains how your staff experience works before your first day of assigned work.`}
          presence
        />

        <div className="kxd-os-ritual-morning__narrative" style={{ maxWidth: "42rem" }}>
          {WELCOME_STEPS.map((step) => (
            <section key={step.title} className="kxd-os-card kxd-os-ops-card-padding" style={{ marginBottom: "1rem" }}>
              <p className="kxd-os-section__label">{step.title}</p>
              <p style={{ marginTop: "0.5rem" }}>{step.body}</p>
            </section>
          ))}
        </div>

        <div style={{ maxWidth: "42rem", marginTop: "1.5rem" }}>
          <OpsCard className="kxd-os-ops-card-padding">
            <p className="kxd-os-section__label">Ready to begin</p>
            <p style={{ marginTop: "0.5rem" }}>
              When you continue, KXD opens your staff home with today&apos;s plan, training progress, and
              one clear Start here action.
            </p>
            {error ? (
              <p className="kxd-os-meta" style={{ marginTop: "0.75rem", color: "var(--kxd-os-critical)" }}>
                {error}
              </p>
            ) : null}
            <div style={{ marginTop: "1.25rem" }}>
              <KxdButton type="button" loading={busy} onClick={handleComplete}>
                Enter staff home
              </KxdButton>
            </div>
          </OpsCard>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
