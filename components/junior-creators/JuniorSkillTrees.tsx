import { buildSkillTreeViews, type SkillProgressState } from "@/lib/junior-creators/skill-trees";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

type Props = {
  totalLeads: number;
};

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

const STATE_LABEL: Record<SkillProgressState, string> = {
  unlocked: "Unlocked",
  "in-progress": "In Progress",
  locked: "Locked",
};

const STATE_COLOR: Record<SkillProgressState, string> = {
  unlocked: C.goldDim,
  "in-progress": C.gold,
  locked: "rgba(245,241,232,0.32)",
};

export function JuniorSkillTrees({ totalLeads }: Props) {
  const tracks = buildSkillTreeViews(totalLeads);

  return (
    <section className="mb-10">
      <div style={{ marginBottom: "1rem" }}>
        <Label style={{ color: C.goldDim, marginBottom: "0.5rem" }}>Skill Trees</Label>
        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, maxWidth: "40rem", lineHeight: 1.6 }}>
          Build expertise across research, websites, branding, and studio operations — aligned with KXD services and standards.
        </p>
      </div>

      <div
        className="grid gap-px lg:grid-cols-2"
        style={{
          background: C.border,
          border: `1px solid ${C.border}`,
        }}
      >
        {tracks.map((track) => (
          <div
            key={track.id}
            style={{
              background: C.glass,
              padding: "1.375rem 1.5rem",
              opacity: track.trackState === "locked" ? 0.72 : 1,
            }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p
                style={{
                  fontFamily: C.serif,
                  fontWeight: 400,
                  fontSize: "1.125rem",
                  color: track.trackState === "locked" ? C.creamMuted : C.cream,
                }}
              >
                {track.title}
              </p>
              <span
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: STATE_COLOR[track.trackState],
                  border: `1px solid ${track.trackState === "locked" ? C.border : C.borderGold}`,
                  padding: "0.2rem 0.5rem",
                }}
              >
                {STATE_LABEL[track.trackState]}
              </span>
            </div>
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: C.creamSubtle,
                lineHeight: 1.55,
                marginBottom: "1.125rem",
              }}
            >
              {track.description}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {track.skills.map((skill) => (
                <div
                  key={skill.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.75rem 0.875rem",
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${skill.state === "locked" ? C.border : C.border}`,
                    borderLeft: skill.state === "in-progress" ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.875rem",
                        color: skill.state === "locked" ? C.creamSubtle : C.cream,
                        fontWeight: 500,
                      }}
                    >
                      {skill.title}
                    </p>
                    <p
                      style={{
                        fontFamily: C.sans,
                        fontSize: "0.8125rem",
                        color: C.creamSubtle,
                        marginTop: "0.2rem",
                        lineHeight: 1.45,
                      }}
                    >
                      {skill.description}
                    </p>
                  </div>
                  <span
                    style={{
                      fontFamily: C.sans,
                      fontSize: "0.6875rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: STATE_COLOR[skill.state],
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {STATE_LABEL[skill.state]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
