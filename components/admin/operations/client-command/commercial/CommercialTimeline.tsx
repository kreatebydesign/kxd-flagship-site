import Link from "next/link";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import { WorkspaceEmpty } from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

export function CommercialTimeline({ data }: { data: ClientWorkspaceBundle }) {
  const rows = data.commercial.timeline;

  return (
    <div className="kxd-os-commercial-section">
      <p className="kxd-os-commercial-lead">
        Commercial activity only — agreements, acceptance, authorizations, invoices, payments, and
        service activation.
      </p>

      {!rows.length ? (
        <WorkspaceEmpty message="No commercial timeline events yet." />
      ) : (
        <ol className="kxd-os-commercial-timeline kxd-os-commercial-timeline--rail">
          {rows.map((row) => (
            <li key={row.id} className="kxd-os-commercial-timeline__item">
              <div className="kxd-os-commercial-timeline__rail" aria-hidden />
              <div className="kxd-os-commercial-timeline__when">
                {row.occurredAt ? fmtWorkspaceDate(row.occurredAt) : "—"}
              </div>
              <div className="kxd-os-commercial-timeline__body">
                <strong>{row.title}</strong>
                {row.summary ? <p>{row.summary}</p> : null}
                {row.href ? (
                  <Link href={row.href} className="kxd-os-link-quiet">
                    Open →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
