import { evaluateMilestones, type MilestoneStats } from "@/lib/junior-creators/academy";

const C = {
  bgElevated: "#0B0B0B",
  bgCard: "#101010",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

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
        color: "rgba(255,255,255,0.3)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function JuniorMilestones({ stats }: Props) {
  const milestones = evaluateMilestones(stats);
  const achievedCount = milestones.filter((m) => m.achieved).length;

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
        <Label style={{ color: C.goldDim }}>Milestones</Label>
        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted }}>
          {achievedCount} of {milestones.length} reached
        </p>
      </div>

      <div
        className="grid gap-px sm:grid-cols-2 lg:grid-cols-3"
        style={{
          background: C.border,
          border: `1px solid ${C.border}`,
        }}
      >
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            style={{
              background: C.bgCard,
              padding: "1.125rem 1.25rem",
              borderLeft: milestone.achieved ? `2px solid ${C.gold}` : "2px solid transparent",
            }}
          >
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: milestone.achieved ? C.goldDim : "rgba(255,255,255,0.28)",
                marginBottom: "0.5rem",
              }}
            >
              {milestone.achieved ? "Reached" : "In progress"}
            </p>
            <p
              style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "1rem",
                color: milestone.achieved ? C.cream : C.creamMuted,
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
                color: "rgba(245,241,232,0.48)",
                lineHeight: 1.5,
              }}
            >
              {milestone.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
