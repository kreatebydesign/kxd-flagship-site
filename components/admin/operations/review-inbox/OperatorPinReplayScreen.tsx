"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReviewPin } from "@/components/ces/review/ReviewPin";
import type { ReviewSessionPin } from "@/lib/ces/review";

export interface OperatorPinReplayScreenProps {
  workspaceUrl: string;
  clientName: string;
  title: string;
  pageUrl: string;
  pin: ReviewSessionPin;
  scrollX: number;
  scrollY: number;
}

/**
 * Operator-only visual pin replay: open stored client page in iframe,
 * restore scroll when same-origin allows, render existing ReviewPin at
 * stored overlay coordinates. Does not create revisions or mutate records.
 */
export function OperatorPinReplayScreen({
  workspaceUrl,
  clientName,
  title,
  pageUrl,
  pin,
  scrollX,
  scrollY,
}: OperatorPinReplayScreenProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scrollNote, setScrollNote] = useState<string | null>(null);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setPulse(false), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  const tryRestoreScroll = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;

    try {
      const win = frame.contentWindow;
      if (!win) {
        setScrollNote(
          scrollX !== 0 || scrollY !== 0
            ? `Scroll to match capture: ${scrollX}, ${scrollY} (cross-origin — adjust manually if needed)`
            : null,
        );
        return;
      }
      win.scrollTo(scrollX, scrollY);
      setScrollNote(null);
    } catch {
      setScrollNote(
        scrollX !== 0 || scrollY !== 0
          ? `Scroll to match capture: ${scrollX}, ${scrollY} (cross-origin — adjust manually if needed)`
          : null,
      );
    }
  }, [scrollX, scrollY]);

  return (
    <div className="kxd-review-session-root kxd-os-pin-replay">
      <header className="kxd-os-pin-replay__bar">
        <div className="kxd-os-pin-replay__bar-main">
          <Link href={workspaceUrl} className="kxd-os-pin-replay__back">
            ← Back to revision
          </Link>
          <div className="kxd-os-pin-replay__identity">
            <p className="kxd-os-pin-replay__client">{clientName}</p>
            <h1 className="kxd-os-pin-replay__title">
              Pin #{pin.number}
              <span className="kxd-os-pin-replay__title-sep">·</span>
              {title}
            </h1>
          </div>
        </div>
        <div className="kxd-os-pin-replay__bar-actions">
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="kxd-os-btn kxd-os-btn--secondary"
          >
            Open page in new tab
          </a>
        </div>
      </header>

      {scrollNote ? (
        <p className="kxd-os-pin-replay__note" role="status">
          {scrollNote}
        </p>
      ) : null}

      <div className="kxd-review-session__stage kxd-os-pin-replay__stage">
        <iframe
          ref={iframeRef}
          title={`Pin replay · ${clientName}`}
          className="kxd-review-session__iframe"
          src={pageUrl}
          onLoad={tryRestoreScroll}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
        <div
          className={`kxd-review-overlay kxd-review-overlay--browse kxd-review-overlay--replay${
            pulse ? " kxd-review-overlay--replay-pulse" : ""
          }`}
          role="presentation"
        >
          <ReviewPin pin={pin} active onSelect={() => undefined} />
        </div>
      </div>
    </div>
  );
}
