"use client";

export function LeadershipReportPrintButton() {
  return (
    <button
      type="button"
      className="kxd-lead-report__print"
      onClick={() => window.print()}
    >
      Print / Save PDF
    </button>
  );
}
