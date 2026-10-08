"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPartnerPathStages,
  operatingChapterLabel,
  partnerIntroAckStorageKey,
  resolveCurrentPathStage,
} from "@/lib/portal/partner/member-browser-state";

type PartnerMemberRecordProps = {
  partnerId: number;
  paidLabel: string;
  paidEarningsCents: number;
  approvedLabel: string;
  early: boolean;
  nextHint: string;
  submittedLeads: number;
  qualifiedLeads: number;
  bookedCalls: number;
  wonClients: number;
};

export function PartnerMemberRecord({
  partnerId,
  paidLabel,
  paidEarningsCents,
  approvedLabel,
  early,
  nextHint,
  submittedLeads,
  qualifiedLeads,
  bookedCalls,
  wonClients,
}: PartnerMemberRecordProps) {
  const router = useRouter();
  const pathStages = buildPartnerPathStages({
    submittedLeads,
    qualifiedLeads,
    bookedCalls,
    wonClients,
  });
  const currentStage = resolveCurrentPathStage({
    submittedLeads,
    qualifiedLeads,
    bookedCalls,
    wonClients,
  });
  const chapterLabel = operatingChapterLabel(currentStage, submittedLeads);
  const hasPaid = paidEarningsCents > 0;

  const [ackVisible, setAckVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pulseIntro, setPulseIntro] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(partnerId) || partnerId <= 0) return;
    let pulseTimer = 0;
    const startTimer = window.setTimeout(() => {
      try {
        const key = partnerIntroAckStorageKey(partnerId);
        const raw = sessionStorage.getItem(key);
        if (!raw) return;

        if (submittedLeads >= 1) {
          sessionStorage.removeItem(key);
          setAckVisible(true);
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches;
          if (!reduce) {
            setPulseIntro(true);
            pulseTimer = window.setTimeout(() => setPulseIntro(false), 320);
          }
          return;
        }

        // Stale Home snapshot — never show a zero path beside the receipt.
        sessionStorage.removeItem(key);
        setConfirming(true);
        router.refresh();
      } catch {
        /* private mode */
      }
    }, 0);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(pulseTimer);
    };
  }, [partnerId, submittedLeads, router]);

  useEffect(() => {
    if (!confirming || submittedLeads < 1) return;
    const t = window.setTimeout(() => {
      setConfirming(false);
      setAckVisible(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, [confirming, submittedLeads]);

  const showPath = !confirming;
  const showZeroComposition = early && !ackVisible && !confirming;

  return (
    <aside className="kxd-partner-folio__plate" aria-label="Your record">
      {confirming ? (
        <div className="kxd-partner-folio__ack" role="status">
          <p className="kxd-partner-folio__ack-title">Confirming introduction…</p>
          <p className="kxd-partner-folio__ack-body">
            Updating your record.
          </p>
        </div>
      ) : null}

      {!confirming && showZeroComposition ? (
        <>
          <p className="kxd-partner-folio__paid-label">Your record</p>
          <p className="kxd-partner-folio__chapter-hero">First introduction</p>
          <p className="kxd-partner-folio__status">
            Your record begins with one qualified introduction.
          </p>
          <p className="kxd-partner-folio__paid-quiet">
            Paid to date <span>{paidLabel}</span>
          </p>
        </>
      ) : null}

      {!confirming && !showZeroComposition ? (
        <>
          {hasPaid ? (
            <>
              <p className="kxd-partner-folio__paid-label">Paid to date</p>
              <p className="kxd-partner-folio__paid">{paidLabel}</p>
              {approvedLabel !== paidLabel ? (
                <p className="kxd-partner-folio__status">
                  Approved {approvedLabel}
                </p>
              ) : null}
              <div className="kxd-partner-folio__chapter">
                <p className="kxd-partner-folio__chapter-kicker">Now</p>
                <p className="kxd-partner-folio__chapter-name">{chapterLabel}</p>
              </div>
            </>
          ) : (
            <>
              <p className="kxd-partner-folio__paid-label">Now</p>
              <p className="kxd-partner-folio__chapter-hero">{chapterLabel}</p>
              <p className="kxd-partner-folio__paid-quiet">
                Paid to date <span>{paidLabel}</span>
              </p>
            </>
          )}
        </>
      ) : null}

      {ackVisible ? (
        <div className="kxd-partner-folio__ack" role="status">
          <p className="kxd-partner-folio__ack-title">Introduction recorded.</p>
          <p className="kxd-partner-folio__ack-body">
            KXD will review the fit and take it from here.
          </p>
        </div>
      ) : null}

      {!confirming && !ackVisible ? (
        <div className="kxd-partner-folio__chapter kxd-partner-folio__chapter--next">
          <p className="kxd-partner-folio__chapter-kicker">Next</p>
          <p className="kxd-partner-folio__chapter-name">{nextHint}</p>
        </div>
      ) : null}

      {showPath ? (
        <div className="kxd-partner-folio__path">
          <p className="kxd-partner-folio__path-kicker">Path</p>
          <p className="kxd-partner-folio__path-legend">
            Introduction → Qualified → Discovery → Client won
          </p>
          {showZeroComposition ? (
            <p className="kxd-partner-folio__path-empty">
              No introductions on the record yet.
            </p>
          ) : (
            <ol
              className="kxd-partner-folio__rest"
              aria-label="Introduction path"
            >
              {pathStages.map((stage) => (
                <li
                  key={stage.id}
                  className={[
                    `is-${stage.role}`,
                    stage.id === "introduction" && pulseIntro ? "is-pulse" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>{stage.label}</span>
                  <span>{stage.value}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </aside>
  );
}
