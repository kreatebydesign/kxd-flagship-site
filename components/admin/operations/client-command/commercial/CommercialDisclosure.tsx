"use client";

import { useState, type ReactNode } from "react";

export function CommercialDisclosure({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`kxd-os-commercial-disclosure${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="kxd-os-commercial-disclosure__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <strong>{title}</strong>
          {summary ? <span className="kxd-os-commercial-disclosure__summary">{summary}</span> : null}
        </span>
        <span className="kxd-os-commercial-disclosure__chevron" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? <div className="kxd-os-commercial-disclosure__body">{children}</div> : null}
    </div>
  );
}
