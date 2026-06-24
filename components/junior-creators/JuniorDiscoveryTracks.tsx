import { DISCOVERY_TRACKS } from "@/lib/junior-creators/discovery-tracks";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.creamSubtle,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function JuniorDiscoveryTracks() {
  return (
    <section className="mb-10">
      <div style={{ marginBottom: "1.25rem" }}>
        <Label style={{ color: C.goldDim, marginBottom: "0.5rem" }}>Discovery Tracks</Label>
        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, maxWidth: "40rem", lineHeight: 1.65 }}>
          Three paths to build real skills — hunt opportunities, investigate websites, and spot brands.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {DISCOVERY_TRACKS.map((track) => (
          <div
            key={track.id}
            style={{
              background: C.glass,
              border: `1px solid ${C.border}`,
              padding: "1.5rem 1.625rem",
            }}
          >
            <h3
              style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "1.375rem",
                color: C.cream,
                marginBottom: "0.5rem",
              }}
            >
              {track.title}
            </h3>
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: C.creamMuted,
                lineHeight: 1.6,
                marginBottom: "1.25rem",
                maxWidth: "40rem",
              }}
            >
              {track.tagline}
            </p>
            <div
              className="grid gap-px sm:grid-cols-2"
              style={{ background: C.border, border: `1px solid ${C.border}` }}
            >
              {track.topics.map((topic) => (
                <div
                  key={topic.title}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    padding: "1.125rem 1.25rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: C.sans,
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      color: C.cream,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {topic.title}
                  </p>
                  <p
                    style={{
                      fontFamily: C.sans,
                      fontSize: "0.8125rem",
                      color: C.creamSubtle,
                      lineHeight: 1.5,
                      marginBottom: "0.625rem",
                    }}
                  >
                    {topic.description}
                  </p>
                  <p
                    style={{
                      fontFamily: C.sans,
                      fontSize: "0.8125rem",
                      color: C.creamMuted,
                      lineHeight: 1.55,
                      fontStyle: "italic",
                      paddingLeft: "0.75rem",
                      borderLeft: `1px solid ${C.borderGold}`,
                    }}
                  >
                    Example: {topic.example}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
