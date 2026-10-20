import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceFormattedText,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { fmtWorkspaceDateTime } from "@/lib/executive-client-workspace/theme";
import type { StaffClientNoteRecord } from "@/lib/staff/client-notes/types";

export interface StaffClientNotesSectionProps {
  notes: StaffClientNoteRecord[];
  clientLabel: string;
  /** Anchor id for deep links from Overview */
  id?: string;
  variant?: "panel" | "inline";
}

function kindLabel(kind: StaffClientNoteRecord["kind"]): string {
  return kind === "question" ? "Question" : "Internal note";
}

export function StaffClientNotesSection({
  notes,
  clientLabel,
  id = "staff-notes",
  variant = "panel",
}: StaffClientNotesSectionProps) {
  const chapterVariant = variant === "inline" ? "compact" : undefined;

  return (
    <div id={id} className="kxd-os-staff-client-notes">
    <WorkspaceChapter
      title="Staff notes & questions"
      variant={chapterVariant}
    >
      <p className="kxd-os-meta" style={{ marginBottom: notes.length ? "1rem" : 0 }}>
        From assigned staff on <strong>{clientLabel}</strong>. Separate from executive Strategy
        Vault notes below.
      </p>
      {notes.length === 0 ? (
        <WorkspaceEmpty message="No staff notes or questions for this client yet." />
      ) : (
        <ul
          className="kxd-os-staff-client-notes__list"
          style={{ listStyle: "none", padding: 0, margin: 0 }}
        >
          {notes.map((note) => (
            <li
              key={note.id}
              className="kxd-os-staff-client-notes__item"
              style={{
                padding: "1rem 0",
                borderTop: "1px solid var(--kxd-border-subtle, rgba(255,255,255,0.08))",
              }}
            >
              <p className="kxd-os-meta">
                <span className="kxd-os-staff-client-notes__kind">{kindLabel(note.kind)}</span>
                {" · "}
                {note.authorDisplayName}
                {" · "}
                {fmtWorkspaceDateTime(note.createdAt)}
                {" · "}
                {clientLabel}
              </p>
              <div style={{ marginTop: "0.5rem" }}>
                <WorkspaceFormattedText text={note.body} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceChapter>
    </div>
  );
}
