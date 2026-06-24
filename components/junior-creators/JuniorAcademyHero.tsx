import type { JuniorCreatorStats } from "@/lib/junior-creators/stats";
import { formatHoursFromMinutes } from "@/lib/junior-creators/week";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

type Props = {
  displayName: string;
  stats: JuniorCreatorStats;
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

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: "1rem 1.125rem" }}>
      <Label>{label}</Label>
      <p
        style={{
          fontFamily: C.serif,
          fontWeight: 300,
          fontSize: "1.35rem",
          color: C.cream,
          marginTop: "0.5rem",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export function JuniorAcademyHero({ displayName, stats }: Props) {
  const { rankProgress } = stats;
  const progressLabel = rankProgress.next
    ? `Level up to ${rankProgress.next.title}`
    : "You reached KXD Legend";

  return (
    <section className="mb-10">
      <div
        style={{
          background: C.glass,
          border: `1px solid ${C.border}`,
          padding: "2rem 2rem 1.75rem",
        }}
      >
        <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>KXD Academy</Label>

        <div style={{ marginBottom: "1.25rem", maxWidth: "42rem" }}>
          <h1
            style={{
              fontFamily: C.serif,
              fontWeight: 300,
              fontSize: "clamp(2rem, 5vw, 3rem)",
              color: C.cream,
              lineHeight: 1.05,
              marginBottom: "0.75rem",
            }}
          >
            Hey, {displayName}
          </h1>
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.875rem",
              color: C.creamMuted,
              lineHeight: 1.65,
              marginBottom: "0.5rem",
            }}
          >
            Learn how KXD discovers opportunities, spots problems, builds brands, and helps businesses grow.
          </p>
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.8125rem",
              color: C.creamSubtle,
              lineHeight: 1.6,
            }}
          >
            Every challenge you complete unlocks new skills. Explore, notice, submit what you find — and level up.
          </p>
        </div>

        <div
          style={{
            marginBottom: "1.75rem",
            padding: "1rem 1.125rem",
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${C.borderGold}`,
          }}
        >
          <p
            style={{
              fontFamily: C.serif,
              fontWeight: 400,
              fontSize: "1.25rem",
              color: C.gold,
              marginBottom: "0.75rem",
            }}
          >
            {rankProgress.current.title}
          </p>
          <div
            className="flex flex-wrap items-center justify-between gap-2"
            style={{ marginBottom: "0.625rem" }}
          >
            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted }}>
              {progressLabel}
            </p>
            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.goldDim }}>
              {rankProgress.progressPercent}%
            </p>
          </div>
          <div
            style={{
              height: "4px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${rankProgress.progressPercent}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})`,
                borderRadius: "2px",
              }}
            />
          </div>
          {rankProgress.next && (
            <p
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: C.creamSubtle,
                marginTop: "0.625rem",
              }}
            >
              {rankProgress.leadsToNext} more discover{rankProgress.leadsToNext === 1 ? "y" : "ies"} to reach{" "}
              {rankProgress.next.title}
            </p>
          )}
        </div>

        <div
          className="grid grid-cols-2 lg:grid-cols-4"
          style={{
            gap: "1px",
            background: C.border,
            border: `1px solid ${C.border}`,
          }}
        >
          <StatCell label="Discoveries Found" value={stats.totalLeads} />
          <StatCell label="Qualified" value={stats.lifetimeQualified} />
          <StatCell label="KXD Wins" value={stats.lifetimeClosedWon} />
          <StatCell label="Hours Exploring" value={formatHoursFromMinutes(stats.lifetimeHoursMinutes)} />
        </div>
      </div>
    </section>
  );
}
