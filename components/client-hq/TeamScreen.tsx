import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalTeamMember } from "@/lib/portal/types";

export function TeamScreen({ members }: { members: PortalTeamMember[] }) {
  const clientMembers = members.filter((m) => m.kind === "client");
  const kxdMembers = members.filter((m) => m.kind === "kxd");

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Account"
        title="Team"
        lead="Your contacts, client users, and the KXD team supporting your business."
      />

      {members.length === 0 ? (
        <KxdEmptyState
          title="Team directory coming soon"
          description="Contacts will appear here as your account is configured."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {clientMembers.length > 0 ? (
            <section>
              <p className="kxd-os-section__label">Your team</p>
              <div className="kxd-os-ops-list">
                {clientMembers.map((member) => (
                  <article key={member.id} className="kxd-os-card">
                    <p className="kxd-os-card__title">{member.name}</p>
                    <p className="kxd-os-meta">{member.role}</p>
                    {member.email ? <p className="kxd-os-body">{member.email}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {kxdMembers.length > 0 ? (
            <section>
              <p className="kxd-os-section__label">KXD account team</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
                  gap: "1rem",
                }}
              >
                {kxdMembers.map((member) => (
                  <article key={member.id} className="kxd-os-card">
                    {member.portraitUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.portraitUrl}
                        alt={member.name}
                        style={{
                          width: "3rem",
                          height: "3rem",
                          borderRadius: "50%",
                          objectFit: "cover",
                          marginBottom: "0.75rem",
                        }}
                      />
                    ) : null}
                    <p className="kxd-os-card__title">{member.name}</p>
                    <p className="kxd-os-meta">{member.role}</p>
                  </article>
                ))}
              </div>
              <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
                Direct messaging coming soon.
              </p>
            </section>
          ) : null}
        </div>
      )}
    </KxdPage>
  );
}
