import { evaluateMilestones, type MilestoneStats, type MilestoneVisualState } from "@/lib/junior-creators/academy";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

type Props = {
  stats: MilestoneStats;
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

const STATE_LABEL: Record<MilestoneVisualState, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  locked: "Locked",
};

const STATE_COLOR: Record<MilestoneVisualState, string> = {
  completed: C.goldDim,
  "in-progress": C.gold,
  locked: "rgba(245,241,232,0.32)",
};

export function JuniorMilestones({ stats }: Props) {
  const milestones = evaluateMilestones(stats);
  const completedCount = milestones.filter((m) => m.visualState === "completed").length;

  return (
    <section className="mb-10">
      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <Label style={{ color: C.goldDim }}>Achievements</Label>
        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted }}>
          {completedCount} of {milestones.length} completed
        </p>
      </div>

      <div
        className="grid gap-px sm:grid-cols-2 lg:grid-cols-3"
        style={{
          background: C.border,
          border: `1px solid ${C.border}`,
        }}
      >
        {milestones.map((milestone) => {
          const state = milestone.visualState;
          const isLocked = state === "locked";

          return (
            <div
              key={milestone.id}
              style={{
                background: C.glass,
                padding: "1.125rem 1.25rem",
                borderLeft:
                  state === "completed"
                    ? `2px solid ${C.gold}`
                    : state === "in-progress"
                      ? `2px solid ${C.goldDim}`
                      : "2px solid transparent",
                opacity: isLocked ? 0.65 : 1,
              }}
            >
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: STATE_COLOR[state],
                  marginBottom: "0.5rem",
                }}
              >
                {STATE_LABEL[state]}
              </p>
              <p
                style={{
                  fontFamily: C.serif,
                  fontWeight: 400,
                  fontSize: "1rem",
                  color: isLocked ? C.creamSubtle : C.cream,
                  lineHeight: 1.2,
                  marginBottom: "0.35rem",
                }}
              >
                {milestone.title}
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.8125rem",
                  color: C.creamSubtle,
                  lineHeight: 1.5,
                }}
              >
                {milestone.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
