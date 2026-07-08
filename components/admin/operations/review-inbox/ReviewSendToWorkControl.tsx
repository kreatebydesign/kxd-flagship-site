"use client";

import Link from "next/link";
import { useState } from "react";

export interface ReviewWorkEngineLink {
  workId: number;
  workNumber: string;
  adminUrl: string;
}

export interface ReviewSendToWorkControlProps {
  reviewId: number;
  clientId: number;
  initialLink?: ReviewWorkEngineLink | null;
}

export function ReviewSendToWorkControl({
  reviewId,
  clientId,
  initialLink,
}: ReviewSendToWorkControlProps) {
  const [link, setLink] = useState<ReviewWorkEngineLink | null>(initialLink ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);

  async function sendToWorkEngine() {
    if (link || loading) return;

    setLoading(true);
    setError(null);
    setJustCreated(false);

    try {
      const res = await fetch("/api/admin/work/from-website-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, clientId }),
      });

      const body = (await res.json()) as {
        ok?: boolean;
        workId?: number;
        workNumber?: string;
        adminUrl?: string;
        created?: boolean;
        error?: string;
      };

      if (!res.ok || !body.ok || !body.workId || !body.workNumber || !body.adminUrl) {
        throw new Error(body.error ?? "Could not send to Work Engine.");
      }

      setLink({
        workId: body.workId,
        workNumber: body.workNumber,
        adminUrl: body.adminUrl,
      });
      setJustCreated(body.created === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send to Work Engine.");
    } finally {
      setLoading(false);
    }
  }

  if (link) {
    return (
      <div className="kxd-os-review-workspace__work-engine kxd-os-review-workspace__work-engine--linked">
        <p className="kxd-os-review-workspace__work-engine-label">
          {justCreated ? "Added to Work Engine" : "Work Created"}
        </p>
        <Link href={link.adminUrl} className="kxd-os-review-workspace__work-engine-link">
          {link.workNumber}
        </Link>
        <p className="kxd-os-review-workspace__work-engine-hint">
          Canonical work is linked to this revision.
        </p>
      </div>
    );
  }

  return (
    <div className="kxd-os-review-workspace__work-engine">
      <button
        type="button"
        className="kxd-os-btn kxd-os-btn--secondary kxd-os-review-workspace__action-btn"
        disabled={loading}
        onClick={() => void sendToWorkEngine()}
      >
        {loading ? "Adding…" : "Send to Work Engine"}
      </button>
      <p className="kxd-os-review-workspace__work-engine-hint">
        Creates canonical Work for studio execution. Safe to click once — duplicates are prevented.
      </p>
      {error ? (
        <p className="kxd-os-review-workspace__notice kxd-os-review-workspace__notice--error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
