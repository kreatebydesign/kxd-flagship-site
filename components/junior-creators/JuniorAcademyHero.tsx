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
    ? `Progress to ${rankProgress.next.title}`
    : "Maximum rank achieved";

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

        <div className="flex flex-wrap items-end justify-between gap-6" style={{ marginBottom: "1.75rem" }}>
          <div>
            <h1
              style={{
                fontFamily: C.serif,
                fontWeight: 300,
                fontSize: "clamp(2rem, 5vw, 3rem)",
                color: C.cream,
                lineHeight: 1.05,
              }}
            >
              {displayName}
            </h1>
            <p
              style={{
                fontFamily: C.serif,
                fontWeight: 400,
                fontSize: "1.375rem",
                color: C.gold,
                marginTop: "0.5rem",
                lineHeight: 1.2,
              }}
            >
              {rankProgress.current.title}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
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
                transition: "width 0.4s ease",
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
              {rankProgress.leadsToNext} more lead{rankProgress.leadsToNext === 1 ? "" : "s"} to reach{" "}
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
          <StatCell label="Lifetime Leads" value={stats.totalLeads} />
          <StatCell label="Qualified Leads" value={stats.lifetimeQualified} />
          <StatCell label="Closed-Won Leads" value={stats.lifetimeClosedWon} />
          <StatCell label="Hours Contributed" value={formatHoursFromMinutes(stats.lifetimeHoursMinutes)} />
        </div>
      </div>
    </section>
  );
}
