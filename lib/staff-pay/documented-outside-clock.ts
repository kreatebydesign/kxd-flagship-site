/** Forensic context only — not payable hours and not inferred duration. */
export type DocumentedOutsideClockEvent = {
  localDateKey: string;
  occurredAtPacific: string;
  source: string;
  action: string;
  evidenceRef: string;
  note: string;
};

const OUTSIDE_CLOCK_EVENTS: DocumentedOutsideClockEvent[] = [
  {
    localDateKey: "2026-10-16",
    occurredAtPacific: "2026-10-16 ~2:10 AM",
    source: "KXD OS Work Engine",
    action: "Test task status updates (work #45)",
    evidenceRef: "work_activity_history · tyler@kreatebydesign.com",
    note:
      "Documented system clicks only. Not counted as clock time and not converted to payable minutes.",
  },
  {
    localDateKey: "2026-10-19",
    occurredAtPacific: "2026-10-19 ~2:36–2:52 PM",
    source: "Staff client notes",
    action: "Twisted Creek Logistics internal notes",
    evidenceRef: "staff_client_notes · author_user_id 3",
    note:
      "Notes prove activity in KXD OS; duration of work is not logged and must not be inferred from timestamps alone.",
  },
  {
    localDateKey: "2026-10-25",
    occurredAtPacific: "2026-10-25 ~10:40 PM",
    source: "Staff documents",
    action: "Policy acknowledgments (acceptable use, confidentiality)",
    evidenceRef: "staff_documents · acknowledged_at",
    note:
      "Administrative acknowledgments. Not payroll hours unless separately approved and clocked.",
  },
];

export function loadDocumentedOutsideClockEvents(): DocumentedOutsideClockEvent[] {
  return [...OUTSIDE_CLOCK_EVENTS];
}
