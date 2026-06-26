import { KxdEmptyState, KxdPage, KxdSection } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalMeetingItem } from "@/lib/portal/types";
import { fmtPortalDate } from "@/lib/portal/format";

function MeetingList({
  title,
  meetings,
  empty,
}: {
  title: string;
  meetings: PortalMeetingItem[];
  empty: string;
}) {
  return (
    <KxdSection label={title}>
      {meetings.length === 0 ? (
        <p className="kxd-os-meta">{empty}</p>
      ) : (
        <div className="kxd-os-ops-list">
          {meetings.map((meeting) => (
            <article key={meeting.id} className="kxd-os-card">
              <p className="kxd-os-card__title">{meeting.title}</p>
              <p className="kxd-os-meta">{fmtPortalDate(meeting.eventDate)}</p>
              {meeting.summary ? (
                <div style={{ marginTop: "1rem" }}>
                  <p className="kxd-os-metric__label">Notes</p>
                  <p className="kxd-os-body">{meeting.summary}</p>
                </div>
              ) : null}
              <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
                AI summaries coming soon.
              </p>
            </article>
          ))}
        </div>
      )}
    </KxdSection>
  );
}

export function MeetingsScreen({ meetings }: { meetings: PortalMeetingItem[] }) {
  const upcoming = meetings
    .filter((m) => m.isUpcoming)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const past = meetings
    .filter((m) => !m.isUpcoming)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Account"
        title="Meetings"
        lead="Upcoming sessions, past conversations, and notes from your KXD relationship."
      />

      {meetings.length === 0 ? (
        <KxdEmptyState
          title="No meetings logged yet"
          description="Meetings will appear here as they are scheduled and completed."
        />
      ) : (
        <div className="kxd-os-operations-split">
          <MeetingList title="Upcoming" meetings={upcoming} empty="No upcoming meetings." />
          <MeetingList title="Past meetings" meetings={past} empty="No past meetings yet." />
        </div>
      )}
    </KxdPage>
  );
}
