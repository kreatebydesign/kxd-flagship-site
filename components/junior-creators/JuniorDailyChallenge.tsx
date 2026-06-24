import { TODAYS_CHALLENGE } from "@/lib/junior-creators/daily-challenge";
import type { RankProgress } from "@/lib/junior-creators/ranks";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

type Props = {
  rankProgress: RankProgress;
};

export function JuniorDailyChallenge({ rankProgress }: Props) {
  const challenge = TODAYS_CHALLENGE;
  const nextRankHint = rankProgress.next
    ? `Progress toward ${rankProgress.next.title}`
    : "You're at the top rank — keep exploring.";

  return (
    <section className="mb-10">
      <div
        style={{
          background: C.glass,
          border: `1px solid ${C.borderGold}`,
          padding: "1.75rem 1.875rem",
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.gold,
            }}
          >
            Today&apos;s Challenge
          </p>
          <span
            style={{
              fontFamily: C.sans,
              fontSize: "0.6875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.creamSubtle,
            }}
          >
            {challenge.estimatedTime}
          </span>
        </div>

        <h2
          style={{
            fontFamily: C.serif,
            fontWeight: 400,
            fontSize: "clamp(1.25rem, 3vw, 1.625rem)",
            color: C.cream,
            lineHeight: 1.2,
            marginBottom: "0.75rem",
            maxWidth: "36rem",
          }}
        >
          {challenge.title}
        </h2>
        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.875rem",
            color: C.creamMuted,
            lineHeight: 1.65,
            maxWidth: "42rem",
            marginBottom: "1.25rem",
          }}
        >
          {challenge.intro}
        </p>

        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: C.goldDim,
            marginBottom: "0.625rem",
          }}
        >
          Look for a business with
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.375rem" }}>
          {challenge.checklist.map((item) => (
            <li
              key={item}
              style={{
                fontFamily: C.sans,
                fontSize: "0.8125rem",
                color: C.creamMuted,
                paddingLeft: "1rem",
                marginBottom: "0.4rem",
                borderLeft: `2px solid ${C.borderGold}`,
                lineHeight: 1.5,
              }}
            >
              {item}
            </li>
          ))}
        </ul>

        <div
          style={{
            paddingTop: "1.125rem",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem 1.5rem",
            alignItems: "baseline",
          }}
        >
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.goldDim }}>
            <span style={{ color: C.creamSubtle }}>Reward · </span>
            {challenge.reward}
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamSubtle }}>
            {nextRankHint}
          </p>
        </div>
      </div>
    </section>
  );
}
