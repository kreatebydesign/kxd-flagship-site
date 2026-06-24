import { ACADEMY_MISSIONS } from "@/lib/junior-creators/missions";
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

export function JuniorAcademyMissions() {
  return (
    <section className="mb-10">
      <div style={{ marginBottom: "1.25rem" }}>
        <Label style={{ color: C.goldDim, marginBottom: "0.5rem" }}>Academy Missions</Label>
        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, maxWidth: "40rem", lineHeight: 1.65 }}>
          Real-world challenges that build your eye for websites, brands, and opportunities. Pick one and explore.
        </p>
      </div>

      <div
        className="grid gap-px sm:grid-cols-2"
        style={{ background: C.border, border: `1px solid ${C.border}` }}
      >
        {ACADEMY_MISSIONS.map((mission) => (
          <article
            key={mission.id}
            style={{
              background: C.glass,
              padding: "1.375rem 1.5rem",
            }}
            className="kxd-mission-card"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.goldDim,
                  border: `1px solid ${C.borderGold}`,
                  padding: "0.2rem 0.5rem",
                }}
              >
                {mission.track}
              </span>
              <span style={{ fontFamily: C.sans, fontSize: "0.6875rem", color: C.creamSubtle }}>
                {mission.difficulty} · {mission.estimatedTime}
              </span>
            </div>
            <h3
              style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "1.125rem",
                color: C.cream,
                lineHeight: 1.25,
                marginBottom: "0.75rem",
              }}
            >
              Mission: {mission.title}
            </h3>
            <Label style={{ marginBottom: "0.5rem" }}>What you&apos;ll learn</Label>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {mission.learnPoints.map((point) => (
                <li
                  key={point}
                  style={{
                    fontFamily: C.sans,
                    fontSize: "0.8125rem",
                    color: C.creamSubtle,
                    lineHeight: 1.5,
                    paddingLeft: "0.875rem",
                    marginBottom: "0.35rem",
                    borderLeft: `1px solid ${C.border}`,
                  }}
                >
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <style>{`
        .kxd-mission-card:hover { background: ${C.glassHover}; }
      `}</style>
    </section>
  );
}
